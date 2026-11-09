import math

import tiktoken

from app.services.catalog import get_catalog
from app.services.tokenizer import TokenizerService, heuristic_count


def test_heuristic_is_ceil_of_chars_over_four():
    assert heuristic_count("", 4) == 0
    assert heuristic_count("abcd", 4) == 1
    assert heuristic_count("abcde", 4) == 2
    assert heuristic_count("hello", 4) == math.ceil(5 / 4)


def test_tiktoken_selection_is_exact(settings):
    model = get_catalog().get("gpt-4o")
    text = "Hello, price calculator."
    system = "Be brief."
    counted = TokenizerService(settings).count(model, text, system)
    encoding = tiktoken.get_encoding("o200k_base")
    assert counted.is_exact is True
    assert counted.tokenizer_used == "tiktoken:o200k_base"
    assert counted.input_tokens == len(encoding.encode(text)) + len(encoding.encode(system))
    assert counted.warnings == []


def test_heuristic_model_is_approximate(settings):
    model = get_catalog().get("mistral-large-4")
    counted = TokenizerService(settings).count(model, "hello", None, remote=False)
    assert counted.is_exact is False
    assert counted.tokenizer_used == "heuristic"
    assert counted.input_tokens == 2


def test_anthropic_without_key_falls_back(settings):
    model = get_catalog().get("claude-sonnet-5-5")
    counted = TokenizerService(settings).count(model, "hello", None, remote=True)
    assert counted.is_exact is False
    assert counted.tokenizer_used == "heuristic"
    assert counted.input_tokens == 2
    assert any("ANTHROPIC_API_KEY" in warning for warning in counted.warnings)


def test_anthropic_remote_count_is_exact(settings, monkeypatch):
    monkeypatch.setattr(
        "app.services.tokenizer.count_anthropic_tokens",
        lambda api_key, model_id, prompt, system_prompt: 42,
    )
    settings.anthropic_api_key = "sk-ant-test"
    model = get_catalog().get("claude-haiku-5-5")
    counted = TokenizerService(settings).count(model, "hello", "sys", remote=True)
    assert counted.is_exact is True
    assert counted.tokenizer_used == "anthropic"
    assert counted.input_tokens == 42


def test_compare_path_does_not_call_remote(settings, monkeypatch):
    def explode(*_args, **_kwargs):
        raise AssertionError("remote tokenizer should not be called")

    monkeypatch.setattr("app.services.tokenizer.count_anthropic_tokens", explode)
    settings.anthropic_api_key = "sk-ant-test"
    model = get_catalog().get("claude-opus-5-5")
    counted = TokenizerService(settings).count(model, "hello", None, remote=False)
    assert counted.is_exact is False
    assert counted.tokenizer_used == "heuristic"
