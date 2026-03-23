from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# In Docker, .env is mounted at /app/.env; locally use project root .env
_env_in_docker = Path("/app/.env")
_env_local = Path(__file__).resolve().parents[2] / ".env"
_env_file = _env_in_docker if _env_in_docker.exists() else _env_local
_env_file_str = str(_env_file) if _env_file.exists() else None


class Settings(BaseSettings):
    PROJECT_NAME: str = "SmartCalorie AI"
    DATABASE_URL: str
    JWT_SECRET: str = "generate_a_long_random_string_here_later"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    USDA_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-flash-latest"
    MLFLOW_TRACKING_URI: str = "http://mlflow:5000"

    model_config = SettingsConfigDict(
        env_file=_env_file_str,
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

