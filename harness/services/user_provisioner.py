import json
import logging
import os
import shutil
import stat
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


def _user_dir(user_id: str) -> Path:
    return Path(settings.FLUENT_DATA_DIR) / user_id


def _api_key_path(user_id: str) -> Path:
    return _user_dir(user_id) / "api_key.json"


def _fluent_dir(user_id: str) -> Path:
    return _user_dir(user_id) / "fluent"


async def validate_api_key(api_key: str) -> bool:
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
            return response.status_code == 200
        except httpx.HTTPError:
            return False


def provision_user(user_id: str, api_key: str) -> bool:
    user_dir = _user_dir(user_id)
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
            logger.warning("template not found: %s", src)

    key_path = _api_key_path(user_id)
    key_path.write_text(json.dumps({"api_key": api_key}))
    key_path.chmod(stat.S_IRUSR | stat.S_IWUSR)

    logger.info("provisioned user %s at %s", user_id, user_dir)
    return True


def get_auth_status(user_id: str) -> AuthStatusResponse:
    configured = _api_key_path(user_id).exists()
    setup_complete = False
    if configured:
        profile_path = _fluent_dir(user_id) / "learner-profile.json"
        if profile_path.exists():
            try:
                data = json.loads(profile_path.read_text())
                name = data.get("learner", {}).get("name", "")
                setup_complete = bool(name) and not name.startswith("{")
            except (json.JSONDecodeError, KeyError):
                pass
    return AuthStatusResponse(configured=configured, setup_complete=setup_complete)
