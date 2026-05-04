import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
import jwt as pyjwt

from models.events import (
    DoneEvent,
    ErrorEvent,
    SkillCompleteEvent,
    SpeakEvent,
    TokenEvent,
)
from services.sse_streamer import serialize_event, stream_agent_response

BASE_URL = "http://test"
JWT_SECRET = "test-secret-key-for-testing-only-at-least-32-chars"


def _make_jwt(sub: str = "user-123", email: str = "test@test.com") -> str:
    return pyjwt.encode({"sub": sub, "email": email}, JWT_SECRET, algorithm="HS256")


@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {_make_jwt()}"}


@pytest.fixture
async def client(tmp_path):
    from config import settings
    settings.FLUENT_DATA_DIR = str(tmp_path / "users")

    from main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as c:
        yield c


class TestSerializeEvent:
    def test_token_event(self):
        event = TokenEvent(content="Καλημέρα!")
        result = serialize_event(event)
        assert result.startswith("event: token\n")
        assert result == 'event: token\ndata: {"type": "token", "content": "Καλημέρα!"}\n\n'

    def test_speak_event(self):
        event = SpeakEvent(phrases=["Καλημέρα", "Με λένε"])
        result = serialize_event(event)
        assert result.startswith("event: speak\n")
        data = json.loads(result.split("data: ", 1)[1].strip())
        assert data["phrases"] == ["Καλημέρα", "Με λένε"]

    def test_skill_complete_event(self):
        event = SkillCompleteEvent(skill="learn")
        result = serialize_event(event)
        assert result.startswith("event: skill-complete\n")
        data = json.loads(result.split("data: ", 1)[1].strip())
        assert data["skill"] == "learn"

    def test_error_event(self):
        event = ErrorEvent(message="Erro ao processar resposta.")
        result = serialize_event(event)
        assert result.startswith("event: error\n")
        data = json.loads(result.split("data: ", 1)[1].strip())
        assert data["message"] == "Erro ao processar resposta."

    def test_done_event(self):
        event = DoneEvent()
        result = serialize_event(event)
        assert result.startswith("event: done\n")
        data = json.loads(result.split("data: ", 1)[1].strip())
        assert data == {"type": "done"}


class TestStreamAgentResponse:
    @pytest.mark.asyncio
    async def test_emits_token_events(self):
        mock_chunk = MagicMock()
        mock_chunk.content = "Hello"

        events = []
        async def fake_astream_events(*args, **kwargs):
            yield {"event": "on_chat_model_stream", "data": {"chunk": mock_chunk}}

        agent = MagicMock()
        agent.astream_events = fake_astream_events

        async for event in stream_agent_response(agent, "user-1", "hi", "learn"):
            events.append(event)

        token_events = [e for e in events if isinstance(e, TokenEvent)]
        assert len(token_events) == 1
        assert token_events[0].content == "Hello"
        assert isinstance(events[-2], SkillCompleteEvent)
        assert isinstance(events[-1], DoneEvent)

    @pytest.mark.asyncio
    async def test_emits_speak_event(self):
        events = []
        async def fake_astream_events(*args, **kwargs):
            yield {
                "event": "on_tool_start",
                "name": "speak_phrases",
                "data": {"input": {"phrases": ["Γειά", "Ευχαριστώ"]}},
            }

        agent = MagicMock()
        agent.astream_events = fake_astream_events

        async for event in stream_agent_response(agent, "user-1", "hi", "learn"):
            events.append(event)

        speak_events = [e for e in events if isinstance(e, SpeakEvent)]
        assert len(speak_events) == 1
        assert speak_events[0].phrases == ["Γειά", "Ευχαριστώ"]

    @pytest.mark.asyncio
    async def test_ignores_other_tools(self):
        events = []
        async def fake_astream_events(*args, **kwargs):
            yield {
                "event": "on_tool_start",
                "name": "read_learner_data",
                "data": {"input": {}},
            }

        agent = MagicMock()
        agent.astream_events = fake_astream_events

        async for event in stream_agent_response(agent, "user-1", "hi", "learn"):
            events.append(event)

        speak_events = [e for e in events if isinstance(e, SpeakEvent)]
        assert len(speak_events) == 0

    @pytest.mark.asyncio
    async def test_emits_skill_complete_and_done(self):
        events = []
        async def fake_astream_events(*args, **kwargs):
            return
            yield

        agent = MagicMock()
        agent.astream_events = fake_astream_events

        async for event in stream_agent_response(agent, "user-1", "hi", "learn"):
            events.append(event)

        assert isinstance(events[0], SkillCompleteEvent)
        assert events[0].skill == "learn"
        assert isinstance(events[1], DoneEvent)

    @pytest.mark.asyncio
    async def test_emits_error_on_exception(self):
        events = []
        async def fake_astream_events(*args, **kwargs):
            raise RuntimeError("boom")
            yield

        agent = MagicMock()
        agent.astream_events = fake_astream_events

        async for event in stream_agent_response(agent, "user-1", "hi", "learn"):
            events.append(event)

        error_events = [e for e in events if isinstance(e, ErrorEvent)]
        assert len(error_events) == 1
        assert error_events[0].message == "Erro ao processar resposta. Tente novamente."
        assert isinstance(events[-1], DoneEvent)

    @pytest.mark.asyncio
    async def test_skips_empty_token_content(self):
        events = []
        async def fake_astream_events(*args, **kwargs):
            mock_chunk = MagicMock()
            mock_chunk.content = ""
            yield {"event": "on_chat_model_stream", "data": {"chunk": mock_chunk}}

        agent = MagicMock()
        agent.astream_events = fake_astream_events

        async for event in stream_agent_response(agent, "user-1", "hi", "learn"):
            events.append(event)

        token_events = [e for e in events if isinstance(e, TokenEvent)]
        assert len(token_events) == 0


class TestMessageEndpoint:
    @pytest.mark.asyncio
    async def test_message_returns_404_without_session(self, client, auth_headers):
        resp = await client.post(
            "/session/message",
            json={"content": "hello"},
            headers=auth_headers,
        )
        assert resp.status_code == 404
        assert "sessão ativa" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_message_requires_auth(self, client):
        resp = await client.post(
            "/session/message",
            json={"content": "hello"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_message_requires_content(self, client, auth_headers):
        resp = await client.post(
            "/session/message",
            json={},
            headers=auth_headers,
        )
        assert resp.status_code == 422
