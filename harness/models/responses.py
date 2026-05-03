from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"


class AuthStatusResponse(BaseModel):
    configured: bool
    setup_complete: bool


class ConfigureResponse(BaseModel):
    provisioned: bool


class SessionStartResponse(BaseModel):
    session_id: str
    skill: str


class SessionStatusResponse(BaseModel):
    active: bool
    skill: str | None = None


class ResumeSessionResponse(BaseModel):
    messages: list[dict]
