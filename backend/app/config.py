from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicPulse API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/civicpulse"
    REDIS_URL: str = "redis://redis:6379/0"

    TRIAGE_PROVIDER: str = "simulated"
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OLLAMA_HOST: str = "http://ollama:11434"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
