from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"


class AuthStatusResponse(BaseModel):
    configured: bool
    setup_complete: bool


class ConfigureResponse(BaseModel):
    provisioned: bool
