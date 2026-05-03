from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_JWT_SECRET: str = ""
    FLUENT_DATA_DIR: str = "/data/users"
    CHECKPOINTS_DB_PATH: str = "/data/checkpoints.db"
    LOG_LEVEL: str = "info"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @model_validator(mode="after")
    def _validate_jwt_secret(self):
        if not self.SUPABASE_JWT_SECRET:
            raise ValueError("SUPABASE_JWT_SECRET must be set and non-empty")
        return self


settings = Settings()
