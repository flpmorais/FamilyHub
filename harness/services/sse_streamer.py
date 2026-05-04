import json
import logging
from dataclasses import asdict, fields

from langchain_core.messages import HumanMessage

from models.events import (
    DoneEvent,
    ErrorEvent,
    SkillCompleteEvent,
    SpeakEvent,
    TokenEvent,
)

logger = logging.getLogger(__name__)

_EXCLUDE_KEYS = {"type"}


async def stream_agent_response(agent, user_id: str, content: str, skill: str):
    try:
        async for event in agent.astream_events(
            {"messages": [HumanMessage(content=content)]},
            config={"configurable": {"thread_id": user_id}},
            version="v2",
        ):
            kind = event.get("event")

            if kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk is None:
                    continue
                text = chunk.content if hasattr(chunk, "content") else str(chunk)
                if isinstance(text, list):
                    text = " ".join(
                        part.get("text", str(part))
                        if isinstance(part, dict)
                        else str(part)
                        for part in text
                    )
                if text:
                    yield TokenEvent(content=text)

            elif kind == "on_tool_start" and event.get("name") == "speak_phrases":
                raw_input = event.get("data", {}).get("input")
                if isinstance(raw_input, dict):
                    phrases = raw_input.get("phrases", [])
                    if phrases:
                        yield SpeakEvent(phrases=phrases)

            elif kind in ("on_chat_model_error", "on_tool_error"):
                error_msg = event.get("data", {}).get("error", {})
                message = str(error_msg) if error_msg else "Erro ao processar resposta."
                yield ErrorEvent(message=message)

        yield SkillCompleteEvent(skill=skill)
        yield DoneEvent()
    except Exception:
        logger.exception("stream error for user=%s", user_id)
        yield ErrorEvent(message="Erro ao processar resposta. Tente novamente.")
        yield DoneEvent()


def serialize_event(sse_event) -> str:
    data = {k: v for k, v in asdict(sse_event).items() if k not in _EXCLUDE_KEYS}
    return f"event: {sse_event.type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
