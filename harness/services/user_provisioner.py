import json
import logging
import os
import re
import shutil
import stat
from enum import Enum
from pathlib import Path

import httpx

from config import settings
from models.responses import AuthStatusResponse

logger = logging.getLogger(__name__)

FLUENT_TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "fluent" / "data-examples"

TEMPLATE_MAP = {
    "learner-profile-template.json": "learner-profile.json",
    "progress-db-template.json": "progress-db.json",
    "mistakes-db-template.json": "mistakes-db.json",
    "mastery-db-template.json": "mastery-db.json",
    "spaced-repetition-template.json": "spaced-repetition.json",
    "session-log-template.json": "session-log.json",
}

_SAFE_USER_ID_RE = re.compile(r"^[a-zA-Z0-9._-]+$")


class KeyValidationResult(str, Enum):
    VALID = "valid"
    INVALID = "invalid"
    UNAVAILABLE = "unavailable"


def _validate_user_id(user_id: str) -> None:
    if not user_id or not user_id.strip():
        raise ValueError("user_id is empty")
    if not _SAFE_USER_ID_RE.match(user_id):
        raise ValueError(f"user_id contains unsafe characters: {user_id!r}")
    if ".." in user_id or "/" in user_id or "\\" in user_id:
        raise ValueError(f"user_id contains path traversal: {user_id!r}")


def _user_dir(user_id: str) -> Path:
    _validate_user_id(user_id)
    return Path(settings.FLUENT_DATA_DIR) / user_id


def _api_key_path(user_id: str) -> Path:
    return _user_dir(user_id) / "api_key.json"


def _fluent_dir(user_id: str) -> Path:
    return _user_dir(user_id) / "fluent"


async def validate_api_key(api_key: str) -> KeyValidationResult:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://open.bigmodel.cn/api/paas/v4/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "glm-4-flash",
                    "messages": [{"role": "user", "content": "hi"}],
                    "max_tokens": 1,
                },
                timeout=15.0,
            )
            if response.status_code == 200:
                return KeyValidationResult.VALID
            if response.status_code in (401, 403):
                return KeyValidationResult.INVALID
            logger.warning(
                "api key validation got unexpected status %d", response.status_code
            )
            return KeyValidationResult.UNAVAILABLE
        except httpx.HTTPError as exc:
            logger.warning("api key validation request failed: %s", exc)
            return KeyValidationResult.UNAVAILABLE


def provision_user(user_id: str, api_key: str) -> None:
    user_dir = _user_dir(user_id)
    api_key_path = _api_key_path(user_id)

    if api_key_path.exists():
        raise FileExistsError(f"user {user_id} is already provisioned")

    fluent_dir = _fluent_dir(user_id)
    results_dir = user_dir / "results"

    fluent_dir.mkdir(parents=True, exist_ok=True)
    results_dir.mkdir(parents=True, exist_ok=True)

    for template_name, dest_name in TEMPLATE_MAP.items():
        src = FLUENT_TEMPLATES_DIR / template_name
        dst = fluent_dir / dest_name
        if src.exists():
            shutil.copy2(src, dst)
        else:
            raise FileNotFoundError(f"required template not found: {src}")

    key_path = _api_key_path(user_id)
    key_path.write_text(json.dumps({"api_key": api_key}))

    try:
        key_path.chmod(stat.S_IRUSR | stat.S_IWUSR)
    except OSError:
        logger.warning("could not set permissions on %s", key_path)

    try:
        user_dir.chmod(stat.S_IRWXU)
    except OSError:
        logger.warning("could not set permissions on %s", user_dir)

    for f in fluent_dir.iterdir():
        try:
            f.chmod(stat.S_IRUSR | stat.S_IWUSR)
        except OSError:
            logger.warning("could not set permissions on %s", f)

    logger.info("provisioned user %s at %s", user_id, user_dir)


def get_auth_status(user_id: str) -> AuthStatusResponse:
    api_key_path = _api_key_path(user_id)
    fluent_dir = _fluent_dir(user_id)

    configured = api_key_path.exists() and fluent_dir.is_dir()
    setup_complete = False
    if configured:
        profile_path = fluent_dir / "learner-profile.json"
        if profile_path.exists():
            try:
                data = json.loads(profile_path.read_text())
                name = data.get("learner", {}).get("name", "")
                setup_complete = bool(name) and "{YOUR_NAME}" not in name
            except (json.JSONDecodeError, KeyError):
                pass
    return AuthStatusResponse(configured=configured, setup_complete=setup_complete)
