import json
import logging
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.providers.base import ProviderResult
from tests.conftest import make_settings


class FakeProvider:
    def __init__(
        self, result: ProviderResult | None = None, error: Exception | None = None
    ) -> None:
        self.result = result or ProviderResult("Hello from the model", 1000, 500, 200)
        self.error = error
        self.calls: list[dict[str, object]] = []

    def complete(self, **kwargs: object) -> ProviderResult:
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.result


def _install(monkeypatch: pytest.MonkeyPatch, provider: FakeProvider) -> None:
    monkeypatch.setattr("app.api.run.provider_for", lambda model: provider)


def test_missing_key_is_400_and_does_not_echo_anything(client):
    response = client.post(
        "/api/run",
        json={"prompt": "Hello", "model_id": "gpt-4o", "api_key": "   "},
    )
    assert response.status_code == 400
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_request_key_is_used_and_not_returned(client, monkeypatch):
    provider = FakeProvider()
    _install(monkeypatch, provider)
    secret = "sk-super-secret-key"
    response = client.post(
        "/api/run",
        json={"prompt": "Hello", "model_id": "gpt-4o", "api_key": secret},
    )
    assert response.status_code == 200
    body = response.json()
    assert secret not in json.dumps(body)
    assert "api_key" not in body
    assert provider.calls[0]["api_key"] == secret
    assert body["response_text"] == "Hello from the model"
    assert body["usage"]["input_tokens"] == 1000
    assert body["usage"]["output_tokens"] == 500
    assert body["usage"]["cached_input_tokens"] == 200
    # 800 * 2.5 / 1e6 + 200 * 1.25 / 1e6 + 500 * 10 / 1e6 = 0.00725
    assert body["cost_usd"] == pytest.approx(0.00725)
    assert body["model"]["id"] == "gpt-4o"


def test_env_key_is_used_when_request_omits_one(monkeypatch):
    provider = FakeProvider(ProviderResult("ok", 10, 5, 0))
    _install(monkeypatch, provider)
    settings = make_settings(anthropic_api_key="sk-ant-server")
    client = TestClient(create_app(settings))
    response = client.post(
        "/api/run",
        json={"prompt": "Hello", "model_id": "claude-sonnet-5-5"},
    )
    assert response.status_code == 200
    assert provider.calls[0]["api_key"] == "sk-ant-server"
    assert "sk-ant-server" not in json.dumps(response.json())
    # 10 * 2 / 1e6 + 5 * 10 / 1e6 = 0.00007
    assert response.json()["cost_usd"] == pytest.approx(0.00007)


def test_provider_error_redacts_the_key(client, monkeypatch, caplog):
    secret = "sk-live-do-not-log"
    provider = FakeProvider(error=RuntimeError(f"rejected key {secret}"))
    _install(monkeypatch, provider)
    with caplog.at_level(logging.DEBUG):
        response = client.post(
            "/api/run",
            json={"prompt": "Hello", "model_id": "gpt-4o-mini", "api_key": secret},
        )
    assert response.status_code == 502
    assert secret not in response.text
    assert "[redacted]" in response.json()["detail"]
    assert secret not in caplog.text


def test_max_output_is_capped(client, monkeypatch):
    provider = FakeProvider(ProviderResult("ok", 1, 1, 0))
    _install(monkeypatch, provider)
    response = client.post(
        "/api/run",
        json={
            "prompt": "Hello",
            "model_id": "gpt-4o",
            "api_key": "sk-test",
            "max_output_tokens": 999999,
        },
    )
    assert response.status_code == 200
    assert provider.calls[0]["max_output_tokens"] == 8192
    assert any("capped" in warning for warning in response.json()["warnings"])


def test_rate_limit(monkeypatch):
    provider = FakeProvider(ProviderResult("ok", 1, 1, 0))
    _install(monkeypatch, provider)
    client = TestClient(create_app(make_settings(rate_limit_run="2/minute")))
    payload = {"prompt": "Hello", "model_id": "gpt-4o", "api_key": "sk-test"}
    assert client.post("/api/run", json=payload).status_code == 200
    assert client.post("/api/run", json=payload).status_code == 200
    blocked = client.post("/api/run", json=payload)
    assert blocked.status_code == 429


def test_openai_chat_reads_usage(monkeypatch):
    from app.providers.openai import OpenAIProvider

    class FakeCompletions:
        def create(self, **kwargs):
            assert kwargs["max_completion_tokens"] == 128
            assert kwargs["model"] == "o3"
            return SimpleNamespace(
                choices=[SimpleNamespace(message=SimpleNamespace(content="hi"))],
                usage=SimpleNamespace(
                    prompt_tokens=10,
                    completion_tokens=4,
                    prompt_tokens_details=SimpleNamespace(cached_tokens=3),
                ),
            )

    class FakeClient:
        def __init__(self, api_key, base_url=None):
            assert api_key == "sk-test"
            assert base_url is None
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setattr("openai.OpenAI", FakeClient)
    result = OpenAIProvider().complete(
        api_key="sk-test",
        model_id="o3",
        prompt="hi",
        system_prompt=None,
        max_output_tokens=128,
        completion_token_param="max_completion_tokens",
    )
    assert result.text == "hi"
    assert result.input_tokens == 10
    assert result.output_tokens == 4
    assert result.cached_input_tokens == 3


def test_registry_picks_a_class_per_provider():
    from app.providers.anthropic import AnthropicProvider
    from app.providers.google import GoogleProvider
    from app.providers.groq import GroqProvider
    from app.providers.mistral import MistralProvider
    from app.providers.openai import OpenAIProvider
    from app.providers.registry import provider_for
    from app.services.catalog import get_catalog

    catalog = get_catalog()
    assert isinstance(provider_for(catalog.get("gpt-4o")), OpenAIProvider)
    assert isinstance(provider_for(catalog.get("claude-opus-5-5")), AnthropicProvider)
    assert isinstance(provider_for(catalog.get("gemini-4-argon")), GoogleProvider)
    assert isinstance(provider_for(catalog.get("mistral-large-4")), MistralProvider)
    assert isinstance(provider_for(catalog.get("llama-3.3-70b-versatile")), GroqProvider)
    assert provider_for(catalog.get("mistral-large-4")).base_url == "https://api.mistral.ai/v1"
