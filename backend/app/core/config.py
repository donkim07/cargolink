from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "CargoLink Africa"
    debug: bool = False
    cors_origins: str = "http://localhost:5173"

    database_url: str = "postgresql+asyncpg://cargolink:cargolink@localhost:5433/cargolink"
    redis_url: str = "redis://localhost:6379/0"

    secret_key: str = "change-me-to-a-long-random-secret-key"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    algorithm: str = "HS256"

    at_username: str = "sandbox"
    at_api_key: str = ""
    at_sms_sender: str = "CargoLink"

    zenopay_api_key: str = ""
    zenopay_account_id: str = ""
    zenopay_callback_url: str = "http://localhost:8000/api/payments/callback"
    zenopay_base_url: str = "https://zenoapi.com/api/payments"

    google_maps_api_key: str = ""

    ussd_code: str = "*384*123#"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
