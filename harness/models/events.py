from dataclasses import dataclass, field
from typing import Literal


@dataclass
class SSEEvent:
    type: str = ""


@dataclass
class TokenEvent(SSEEvent):
    type: Literal["token"] = "token"
    content: str = ""


@dataclass
class SpeakEvent(SSEEvent):
    type: Literal["speak"] = "speak"
    phrases: list[str] = field(default_factory=list)


@dataclass
class SkillCompleteEvent(SSEEvent):
    type: Literal["skill-complete"] = "skill-complete"
    skill: str = ""


@dataclass
class ErrorEvent(SSEEvent):
    type: Literal["error"] = "error"
    message: str = ""


@dataclass
class DoneEvent(SSEEvent):
    type: Literal["done"] = "done"
