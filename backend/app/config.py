"""Runtime configuration loaded from environment variables."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_KEY_NAMES: dict[str, str] = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "google": "GOOGLE_API_KEY",
    "mistral": "MISTRAL_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "groq": "GROQ_API_KEY",
}


class Settings(BaseSettings):
    """All tunables are environment variables. See the repo `.env.example`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True,
    )

    cors_origins: str = "http://localhost:3000"
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    google_api_key: str | None = None
    mistral_api_key: str | None = None
    deepseek_api_key: str | None = None
    groq_api_key: str | None = None

    max_output_tokens_cap: int = Field(default=8192, ge=1)
    default_max_output_tokens: int = Field(default=1024, ge=1)
    rate_limit_run: str = "10/minute"

    # Output-length heuristic used when the caller does not pass expected_output_tokens.
    # low = max(low_min, round(low_ratio * input_tokens))
    # expected = max(expected_min, round(expected_ratio * input_tokens))
    # high = min(round(high_ratio * input_tokens), model max_output_tokens)
    # Values are then clamped so low <= expected <= high <= max_output_tokens.
    estimate_output_low_ratio: float = 0.10
    estimate_output_expected_ratio: float = 0.50
    estimate_output_high_ratio: float = 2.0
    estimate_output_low_min: int = 50
    estimate_output_expected_min: int = 150
    chars_per_token: int = Field(default=4, ge=1)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def env_key_for(self, provider: str) -> str | None:
        mapping = {
            "openai": self.openai_api_key,
            "anthropic": self.anthropic_api_key,
            "google": self.google_api_key,
            "mistral": self.mistral_api_key,
            "deepseek": self.deepseek_api_key,
            "groq": self.groq_api_key,
        }
        value = mapping.get(provider)
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


@lru_cache
def get_settings() -> Settings:
    return Settings()
