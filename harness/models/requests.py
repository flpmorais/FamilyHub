from pydantic import BaseModel, Field


class ConfigureApiKeyRequest(BaseModel):
    api_key: str = Field(..., min_length=1)
