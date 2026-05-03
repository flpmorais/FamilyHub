import copy
import datetime
import json
import logging
import os
import shutil
import sys
from pathlib import Path

from langchain_core.tools import tool

logger = logging.getLogger(__name__)

FLUENT_ROOT = Path(__file__).resolve().parent.parent.parent / "fluent"
SKILLS_DIR = FLUENT_ROOT / ".claude" / "skills"
HOOKS_DIR = FLUENT_ROOT / ".claude" / "hooks"
LEARNING_SYSTEM_MD = FLUENT_ROOT / "LEARNING_SYSTEM.md"

LEARNER_SKILLS = frozenset({
    "setup", "learn", "review", "vocab",
    "writing", "speaking", "reading", "progress",
})

_FLUENT_DB_FILES = [
    "learner-profile.json",
    "progress-db.json",
    "mistakes-db.json",
    "mastery-db.json",
    "spaced-repetition.json",
    "session-log.json",
]

_HARNESS_PERSIST_FOOTER = """\

---

## Harness Integration Instructions

You are running inside the FamilyHub harness. You have access to these tools:
- `read_learner_data`: Read all 6 learning databases.
- `update_learner_data`: Persist session results to all 6 databases. \
Call this at the end of every session with a complete session report JSON.
- `speak_phrases`: Mark Greek phrases for audio playback.

**CRITICAL: You MUST call `update_learner_data` at the end of every learning \
session** to persist the learner's progress. Construct a session report JSON \
with at minimum: `session_id`, `date` (YYYY-MM-DD), and any skill scores, \
errors, or review results from the session. Without this call, the learner's \
progress will be lost.
"""

_read_db_module = None
_update_db_module = None


def _get_fluent_modules():
    global _read_db_module, _update_db_module
    if _update_db_module is not None:
        return _read_db_module, _update_db_module

    import importlib

    orig_env = os.environ.get("FLUENT_DATA_DIR")
    os.environ["FLUENT_DATA_DIR"] = "/tmp/fluent-import-placeholder"
    snapshot = list(sys.path)
    try:
        sys.path.insert(0, str(HOOKS_DIR))
        _read_db_module = importlib.import_module("read-db")
        _update_db_module = importlib.import_module("update-db")
    finally:
        sys.path[:] = snapshot
        if orig_env is not None:
            os.environ["FLUENT_DATA_DIR"] = orig_env
        else:
            os.environ.pop("FLUENT_DATA_DIR", None)

    return _read_db_module, _update_db_module


def discover_skills() -> dict[str, Path]:
    skills: dict[str, Path] = {}
    if not SKILLS_DIR.is_dir():
        logger.warning("skills directory not found: %s", SKILLS_DIR)
        return skills
    for entry in sorted(SKILLS_DIR.iterdir()):
        skill_md = entry / "SKILL.md"
        if entry.is_dir() and skill_md.is_file() and entry.name in LEARNER_SKILLS:
            skills[entry.name] = skill_md
    return skills


def load_skill_prompt(skill_name: str) -> str:
    skills = discover_skills()
    if skill_name not in skills:
        raise ValueError(f"unknown skill: {skill_name!r}. available: {sorted(skills.keys())}")

    parts: list[str] = []

    if LEARNING_SYSTEM_MD.is_file():
        try:
            parts.append(LEARNING_SYSTEM_MD.read_text(encoding="utf-8"))
        except OSError as e:
            raise ValueError(f"unreadable learning system file: {LEARNING_SYSTEM_MD}: {e}") from e

    try:
        parts.append(skills[skill_name].read_text(encoding="utf-8"))
    except OSError as e:
        raise ValueError(f"unreadable skill file: {skills[skill_name]}: {e}") from e

    parts.append(_HARNESS_PERSIST_FOOTER)

    return "\n\n---\n\n".join(parts)


def _load_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        logger.warning("corrupt json file: %s", path)
        return None


def _save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(".json.tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
        f.flush()
        os.fsync(f.fileno())
    os.rename(tmp_path, path)


def _backup_file(path: Path) -> None:
    if not path.exists():
        return
    try:
        shutil.copy2(path, path.with_suffix(".json.bak"))
    except OSError:
        logger.warning("failed to backup %s", path)


def create_read_db_tool(user_data_dir: Path):
    @tool
    def read_learner_data() -> str:
        """Read all 6 Fluent learning databases for the current user.
        Returns a JSON string containing learner profile, progress, mistakes,
        mastery, spaced repetition, and session log data."""
        read_mod, _ = _get_fluent_modules()
        databases: dict[str, dict] = {}
        for db_file in _FLUENT_DB_FILES:
            key = db_file.replace(".json", "").replace("-", "_")
            data = read_mod.load_json(user_data_dir / db_file)
            databases[key] = data if data is not None else {}

        now_iso = datetime.datetime.now().isoformat()
        return json.dumps({
            "databases": databases,
            "computed": {"queried_at": now_iso},
        }, ensure_ascii=False)

    read_learner_data.name = "read_learner_data"
    return read_learner_data


def create_update_db_tool(user_data_dir: Path):
    @tool
    def update_learner_data(session_report_json: str) -> str:
        """Update all 6 Fluent learning databases from a session report.
        Input must be a JSON string matching the Fluent session report schema
        with fields: session_id, date, skill_scores, errors, review_results, etc."""
        try:
            session = json.loads(session_report_json)
        except json.JSONDecodeError as e:
            return json.dumps({"error": f"invalid JSON: {e}"})

        if not isinstance(session, dict):
            return json.dumps({"error": "session report must be a JSON object"})

        for field in ("session_id", "date"):
            if field not in session:
                return json.dumps({"error": f"missing required field: {field}"})

        try:
            datetime.datetime.strptime(session["date"], "%Y-%m-%d")
        except ValueError:
            return json.dumps({"error": f"invalid date format: {session['date']!r}. expected YYYY-MM-DD"})

        session.setdefault("duration_minutes", 0)

        files = {
            "profile": user_data_dir / "learner-profile.json",
            "progress": user_data_dir / "progress-db.json",
            "mistakes": user_data_dir / "mistakes-db.json",
            "mastery": user_data_dir / "mastery-db.json",
            "sr": user_data_dir / "spaced-repetition.json",
            "log": user_data_dir / "session-log.json",
        }

        originals: dict[str, dict] = {}
        for k, p in files.items():
            data = _load_json(p)
            if data is None:
                originals[k] = {}
            else:
                originals[k] = data

        for p in files.values():
            _backup_file(p)

        data = {k: copy.deepcopy(v) for k, v in originals.items()}

        _, update_mod = _get_fluent_modules()
        try:
            update_mod.update_learner_profile(data["profile"], session)
            update_mod.update_progress_db(data["progress"], session)
            update_mod.update_mistakes_db(data["mistakes"], session)
            update_mod.update_mastery_db(data["mastery"], session, data["progress"])
            update_mod.update_spaced_repetition(data["sr"], session)
            streak = data["profile"].get("current_streak_days", 0)
            update_mod.update_session_log(data["log"], session, streak)
        except (KeyError, TypeError, ValueError) as e:
            logger.error("update failed for user_data_dir=%s, restoring backups: %s", user_data_dir, e)
            for k, p in files.items():
                _save_json(p, originals[k])
            return json.dumps({"error": f"update failed, databases restored: {e}"})

        for k, p in files.items():
            _save_json(p, data[k])

        stats = data["progress"].get("overall_stats", {})
        return json.dumps({
            "updated": True,
            "session_id": session["session_id"],
            "streak": streak,
            "total_sessions": stats.get("total_sessions", 0),
        }, ensure_ascii=False)

    update_learner_data.name = "update_learner_data"
    return update_learner_data


def create_speak_tool():
    @tool
    def speak_phrases(phrases: list[str]) -> str:
        """Mark Greek phrases for TTS playback. Use this when you want the learner
        to hear pronunciation of Greek text. Pass a list of Greek phrases."""
        return json.dumps({"speak": phrases})

    speak_phrases.name = "speak_phrases"
    return speak_phrases
