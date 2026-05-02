import json
import os
import stat
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
import jwt as pyjwt

BASE_URL = "http://test"
JWT_SECRET = "test-secret-key-for-testing-only-at-least-32-chars"


def _make_jwt(sub: str = "user-123", email: str = "test@test.com") -> str:
    return pyjwt.encode({"sub": sub, "email": email}, JWT_SECRET, algorithm="HS256")


def _make_expired_jwt(sub: str = "user-123") -> str:
    import time

    return pyjwt.encode(
        {"sub": sub, "email": "test@test.com", "exp": int(time.time()) - 3600},
        JWT_SECRET,
        algorithm="HS256",
    )


@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {_make_jwt()}"}


@pytest.fixture
def auth_headers_user2():
    return {"Authorization": f"Bearer {_make_jwt(sub='user-456', email='other@test.com')}"}


@pytest.fixture
async def client(tmp_path):
    from config import settings
    settings.FLUENT_DATA_DIR = str(tmp_path / "users")

    from main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as c:
        yield c


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_auth_status_unconfigured(client: AsyncClient, auth_headers):
    resp = await client.get("/auth/status", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["configured"] is False
    assert data["setup_complete"] is False


@pytest.mark.asyncio
async def test_auth_status_no_jwt(client: AsyncClient):
    resp = await client.get("/auth/status")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_status_invalid_jwt(client: AsyncClient):
    resp = await client.get(
        "/auth/status", headers={"Authorization": "Bearer invalid-token"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_auth_status_expired_jwt(client: AsyncClient):
    resp = await client.get(
        "/auth/status", headers={"Authorization": f"Bearer {_make_expired_jwt()}"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
@patch("routers.auth.validate_api_key", new_callable=AsyncMock, return_value=True)
async def test_configure_api_key_success(mock_validate, client: AsyncClient, auth_headers, tmp_path):
    resp = await client.post(
        "/auth/configure",
        json={"api_key": "sk-test-valid-key"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["provisioned"] is True

    user_dir = tmp_path / "users" / "user-123"
    assert user_dir.exists()
    assert (user_dir / "fluent").is_dir()
    assert (user_dir / "results").is_dir()

    api_key_path = user_dir / "api_key.json"
    assert api_key_path.exists()
    key_data = json.loads(api_key_path.read_text())
    assert key_data["api_key"] == "sk-test-valid-key"
    mode = api_key_path.stat().st_mode
    assert mode & stat.S_IRUSR
    assert mode & stat.S_IWUSR
    assert not (mode & stat.S_IRGRP)
    assert not (mode & stat.S_IROTH)

    fluent_dir = user_dir / "fluent"
    assert (fluent_dir / "learner-profile.json").exists()
    assert (fluent_dir / "progress-db.json").exists()
    assert (fluent_dir / "mistakes-db.json").exists()
    assert (fluent_dir / "mastery-db.json").exists()
    assert (fluent_dir / "spaced-repetition.json").exists()
    assert (fluent_dir / "session-log.json").exists()


@pytest.mark.asyncio
@patch("routers.auth.validate_api_key", new_callable=AsyncMock, return_value=False)
async def test_configure_api_key_invalid(mock_validate, client: AsyncClient, auth_headers):
    resp = await client.post(
        "/auth/configure",
        json={"api_key": "sk-invalid-key"},
        headers=auth_headers,
    )
    assert resp.status_code == 400
    assert "API key validation failed" in resp.json()["detail"]


@pytest.mark.asyncio
@patch("routers.auth.validate_api_key", new_callable=AsyncMock, return_value=True)
async def test_auth_status_after_configure(mock_validate, client: AsyncClient, auth_headers):
    await client.post(
        "/auth/configure",
        json={"api_key": "sk-test-key"},
        headers=auth_headers,
    )
    resp = await client.get("/auth/status", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["configured"] is True
    assert data["setup_complete"] is False


@pytest.mark.asyncio
@patch("routers.auth.validate_api_key", new_callable=AsyncMock, return_value=True)
async def test_auth_status_setup_complete(mock_validate, client: AsyncClient, auth_headers, tmp_path):
    await client.post(
        "/auth/configure",
        json={"api_key": "sk-test-key"},
        headers=auth_headers,
    )

    learner_profile = tmp_path / "users" / "user-123" / "fluent" / "learner-profile.json"
    original = json.loads(learner_profile.read_text())
    original["learner"]["name"] = "Filipe"
    learner_profile.write_text(json.dumps(original))

    resp = await client.get("/auth/status", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["configured"] is True
    assert data["setup_complete"] is True


@pytest.mark.asyncio
@patch("routers.auth.validate_api_key", new_callable=AsyncMock, return_value=True)
async def test_per_user_isolation(mock_validate, client: AsyncClient, auth_headers, auth_headers_user2, tmp_path):
    await client.post(
        "/auth/configure",
        json={"api_key": "sk-filipe-key"},
        headers=auth_headers,
    )
    await client.post(
        "/auth/configure",
        json={"api_key": "sk-angela-key"},
        headers=auth_headers_user2,
    )

    filipe_key = json.loads((tmp_path / "users" / "user-123" / "api_key.json").read_text())
    angela_key = json.loads((tmp_path / "users" / "user-456" / "api_key.json").read_text())
    assert filipe_key["api_key"] == "sk-filipe-key"
    assert angela_key["api_key"] == "sk-angela-key"

    assert (tmp_path / "users" / "user-123" / "fluent" / "learner-profile.json").exists()
    assert (tmp_path / "users" / "user-456" / "fluent" / "learner-profile.json").exists()


@pytest.mark.asyncio
async def test_configure_no_jwt(client: AsyncClient):
    resp = await client.post(
        "/auth/configure",
        json={"api_key": "sk-test"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_configure_empty_api_key(client: AsyncClient, auth_headers):
    resp = await client.post(
        "/auth/configure",
        json={"api_key": ""},
        headers=auth_headers,
    )
    assert resp.status_code == 422
