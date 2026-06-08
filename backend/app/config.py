from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # GitHub App
    github_app_id: str
    github_private_key: str  # base64-encoded PEM
    github_webhook_secret: str
    github_client_id: str = ""
    github_client_secret: str = ""

    # LLM
    groq_api_key: str

    # Embeddings (HuggingFace)
    hf_api_key: str = ""

    # Database
    mongodb_uri: str

    # Cache
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""

    # App
    app_base_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"
    jwt_secret: str = "change-me-in-production"
    debug: bool = False

    # Limits
    max_diff_tokens: int = 8000
    webhook_dedup_ttl: int = 30  # seconds


@lru_cache
def get_settings() -> Settings:
    return Settings()
