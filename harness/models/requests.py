from pydantic import BaseModel, Field


class ConfigureApiKeyRequest(BaseModel):
    api_key: str = Field(..., min_length=1)


class StartSessionRequest(BaseModel):
    skill: str = Field(..., min_length=1)


class MessageRequest(BaseModel):
    content: str = Field(..., min_length=1)
