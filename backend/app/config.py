from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TaskBridge"
    environment: str = "development"
    database_url: str = "sqlite:///./taskbridge.db"
    redis_url: str = "redis://redis:6379/0"
    telegram_bot_token: str = ""
    mini_app_url: str = "https://taskbridge.zavozikkvn.ru/"
    deepl_api_key: str = ""
    default_city: str = "Tbilisi"
    default_currency: str = "GEL"
    allowed_origins: list[str] = Field(default_factory=lambda: ["*"])
    dev_auth_enabled: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
