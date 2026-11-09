import os

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

os.environ.setdefault("RATE_LIMIT_RUN", "1000/minute")


def make_settings(**overrides: object) -> Settings:
    base = {
        "cors_origins": "http://localhost:3000",
        "rate_limit_run": "1000/minute",
        "openai_api_key": None,
        "anthropic_api_key": None,
        "google_api_key": None,
        "mistral_api_key": None,
        "deepseek_api_key": None,
        "groq_api_key": None,
    }
    base.update(overrides)
    return Settings(**base)  # type: ignore[arg-type]


@pytest.fixture
def settings() -> Settings:
    return make_settings()


@pytest.fixture
def client(settings: Settings) -> TestClient:
    return TestClient(create_app(settings))
