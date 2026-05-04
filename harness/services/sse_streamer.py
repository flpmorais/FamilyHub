import json
import logging
from dataclasses import asdict

from langchain_core.messages import HumanMessage

from models.events import (
    DoneEvent,
    ErrorEvent,
    SkillCompleteEvent,
    SpeakEvent,
    TokenEvent,
)

logger = logging.getLogger(__name__)


async def stream_agent_response(agent, user_id: str, content: str, skill: str):
    try:
        async for event in agent.astream_events(
            {"messages": [HumanMessage(content=content)]},
            config={"configurable": {"thread_id": user_id}},
            version="v2",
        ):
            kind = event.get("event")

            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                text = chunk.content if hasattr(chunk, "content") else str(chunk)
                if text:
                    yield TokenEvent(content=text)

            elif kind == "on_tool_start" and event.get("name") == "speak_phrases":
                phrases = event["data"]["input"].get("phrases", [])
                if phrases:
                    yield SpeakEvent(phrases=phrases)

        yield SkillCompleteEvent(skill=skill)
        yield DoneEvent()
    except Exception as exc:
        logger.exception("stream error for user=%s", user_id)
        yield ErrorEvent(message="Erro ao processar resposta. Tente novamente.")
        yield DoneEvent()


def serialize_event(sse_event) -> str:
    data = json.dumps(asdict(sse_event), ensure_ascii=False)
    return f"event: {sse_event.type}\ndata: {data}\n\n"
