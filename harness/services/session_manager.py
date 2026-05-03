import asyncio
import hashlib
import json
import logging
import uuid
from contextlib import ExitStack
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from langchain_openai import ChatOpenAI
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.prebuilt import create_react_agent

from config import settings
from services.fluent_loader import (
    _FLUENT_DB_FILES,
    _load_json,
    _save_json,
    create_read_db_tool,
    create_speak_tool,
    create_update_db_tool,
    discover_skills,
    load_skill_prompt,
)

logger = logging.getLogger(__name__)


def _normalize_ts_ms(value: int | float) -> int:
    f = float(value)
    if f > 1e12:
        return int(f)
    return int(f * 1000)


@dataclass
class SessionInfo:
    session_id: str
    user_id: str
    skill: str
    agent: object = field(repr=False)


class SessionManager:
    def __init__(self) -> None:
        self._agents: dict[str, object] = {}
        self._sessions: dict[str, SessionInfo] = {}
        self._skills = discover_skills()
        self._exit_stack = ExitStack()
        self._checkpointer: SqliteSaver | None = None

    def _get_checkpointer(self) -> SqliteSaver:
        if self._checkpointer is None:
            checkpoints_path = Path(settings.CHECKPOINTS_DB_PATH)
            checkpoints_path.parent.mkdir(parents=True, exist_ok=True)
            self._checkpointer = self._exit_stack.enter_context(
                SqliteSaver.from_conn_string(str(checkpoints_path))
            )
        return self._checkpointer

    async def create_agent(self, user_id: str, skill: str, api_key: str) -> SessionInfo:
        if skill not in self._skills:
            raise ValueError(f"unknown skill: {skill!r}. available: {sorted(self._skills.keys())}")

        if user_id in self._agents:
            logger.warning("replacing existing agent for user=%s", user_id)
            await self.end_session(user_id)

        system_prompt = await asyncio.to_thread(load_skill_prompt, skill)

        llm = ChatOpenAI(
            model="glm-4-flash",
            api_key=api_key,
            base_url="https://open.bigmodel.cn/api/paas/v4",
        )

        user_data_dir = Path(settings.FLUENT_DATA_DIR) / user_id / "fluent"
        read_tool = create_read_db_tool(user_data_dir)
        update_tool = create_update_db_tool(user_data_dir)
        speak_tool = create_speak_tool()

        checkpointer = self._get_checkpointer()

        agent = create_react_agent(
            model=llm,
            tools=[read_tool, update_tool, speak_tool],
            prompt=system_prompt,
            checkpointer=checkpointer,
        )

        session_id = str(uuid.uuid4())
        info = SessionInfo(
            session_id=session_id,
            user_id=user_id,
            skill=skill,
            agent=agent,
        )
        self._agents[user_id] = agent
        self._sessions[user_id] = info

        logger.info("created agent for user=%s skill=%s session=%s", user_id, skill, session_id)
        return info

    def get_agent(self, user_id: str):
        return self._agents.get(user_id)

    def get_session_info(self, user_id: str) -> SessionInfo | None:
        return self._sessions.get(user_id)

    async def destroy_agent(self, user_id: str) -> None:
        self._agents.pop(user_id, None)
        self._sessions.pop(user_id, None)
        logger.info("destroyed agent for user=%s", user_id)

    def load_user_fluent_data(self, user_id: str) -> dict:
        user_data_dir = Path(settings.FLUENT_DATA_DIR) / user_id / "fluent"
        data: dict[str, dict] = {}
        for db_file in _FLUENT_DB_FILES:
            path = user_data_dir / db_file
            if path.exists():
                try:
                    data[db_file] = json.loads(path.read_text(encoding="utf-8"))
                except (json.JSONDecodeError, OSError):
                    data[db_file] = {}
            else:
                data[db_file] = {}
        return data

    def resume_session(self, user_id: str) -> list[dict]:
        info = self.get_session_info(user_id)
        if info is None:
            raise ValueError(f"no active session for user {user_id}")

        checkpointer = self._get_checkpointer()
        config = {"configurable": {"thread_id": user_id}}
        checkpoint_tuple = checkpointer.get_tuple(config)

        messages: list[dict] = []
        if checkpoint_tuple and checkpoint_tuple.checkpoint:
            try:
                checkpoint_data = checkpoint_tuple.checkpoint
                if isinstance(checkpoint_data, dict):
                    channel_values = checkpoint_data.get("channel_values") or {}
                elif hasattr(checkpoint_data, "channel_values"):
                    channel_values = getattr(checkpoint_data, "channel_values", None) or {}
                else:
                    channel_values = {}
                raw_messages = channel_values.get("messages", []) if isinstance(channel_values, dict) else []
            except (AttributeError, TypeError):
                logger.warning("unexpected checkpoint format for user=%s", user_id)
                raw_messages = []

            for idx, msg in enumerate(raw_messages):
                role = "agent"
                if hasattr(msg, "type"):
                    role = "user" if msg.type == "human" else "agent"
                elif hasattr(msg, "role"):
                    role = "user" if msg.role == "user" else "agent"

                ts = int(datetime.now().timestamp() * 1000)
                if hasattr(msg, "additional_kwargs"):
                    ts_meta = msg.additional_kwargs.get("timestamp")
                    if isinstance(ts_meta, (int, float)):
                        ts = _normalize_ts_ms(ts_meta)
                    elif isinstance(ts_meta, str):
                        try:
                            ts = int(datetime.fromisoformat(ts_meta).timestamp() * 1000)
                        except (ValueError, TypeError):
                            pass
                elif hasattr(msg, "response_metadata"):
                    ts_meta = msg.response_metadata.get("timestamp")
                    if isinstance(ts_meta, (int, float)):
                        ts = _normalize_ts_ms(ts_meta)

                content_str = str(msg.content) if hasattr(msg, "content") else str(msg)
                msg_id = hashlib.sha256(
                    f"{user_id}:{info.session_id}:{idx}:{content_str[:200]}".encode()
                ).hexdigest()[:16]
                messages.append({
                    "id": msg_id,
                    "role": role,
                    "content": content_str,
                    "timestamp": ts,
                })

        logger.info("resumed session for user=%s, %d messages", user_id, len(messages))
        return messages

    def _persist_fluent_data(self, user_id: str, info: SessionInfo) -> None:
        user_data_dir = Path(settings.FLUENT_DATA_DIR) / user_id / "fluent"
        for db_file in _FLUENT_DB_FILES:
            path = user_data_dir / db_file
            data = _load_json(path)
            if data is not None:
                _save_json(path, data)
        logger.info("persisted fluent data for user=%s session=%s", user_id, info.session_id)

    async def end_session(self, user_id: str) -> None:
        info = self.get_session_info(user_id)
        if info is None:
            logger.warning("no active session to end for user=%s", user_id)
            return

        self._agents.pop(user_id, None)
        self._sessions.pop(user_id, None)
        try:
            await asyncio.to_thread(self._persist_fluent_data, user_id, info)
        except Exception:
            logger.exception("failed to persist fluent data for user=%s", user_id)
        try:
            await asyncio.to_thread(self.write_session_result, user_id, info)
        except Exception:
            logger.exception("failed to write session result for user=%s", user_id)
        logger.info("ended session for user=%s session=%s", user_id, info.session_id)

    def write_session_result(self, user_id: str, info: SessionInfo) -> None:
        results_dir = Path(settings.FLUENT_DATA_DIR) / user_id / "results"
        results_dir.mkdir(parents=True, exist_ok=True)

        result_file = results_dir / f"{info.session_id}.md"
        now = datetime.now()
        content = (
            f"# Session {info.session_id}\n\n"
            f"- **Date:** {now.strftime('%Y-%m-%d %H:%M')}\n"
            f"- **Skill:** {info.skill}\n"
            f"- **User:** {user_id}\n"
        )
        result_file.write_text(content, encoding="utf-8")
        logger.info("wrote session result to %s", result_file)

    def close(self) -> None:
        self._exit_stack.close()
        self._checkpointer = None


session_manager = SessionManager()
