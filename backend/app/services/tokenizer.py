"""Resolve a tokenizer for each catalog model.

OpenAI models use tiktoken locally (`tiktoken:<encoding>`), which is exact.
Anthropic and Google can use their count-tokens endpoints when a server API key
is configured and the caller allows a remote call. Everything else, and any
failed remote count, falls back to a documented heuristic of about 4 characters
per token (`chars_per_token`, default 4).
"""

from dataclasses import dataclass, field

import tiktoken

from app.config import Settings
from app.schemas import ModelSpec


@dataclass
class TokenCount:
    input_tokens: int
    tokenizer_used: str
    is_exact: bool
    warnings: list[str] = field(default_factory=list)


_ENCODINGS: dict[str, tiktoken.Encoding] = {}


def _encoding(name: str) -> tiktoken.Encoding:
    cached = _ENCODINGS.get(name)
    if cached is None:
        cached = tiktoken.get_encoding(name)
        _ENCODINGS[name] = cached
    return cached


def heuristic_count(text: str, chars_per_token: int) -> int:
    if not text:
        return 0
    return max(1, -(-len(text) // chars_per_token))  # ceil division


def _count_pieces(texts: list[str], chars_per_token: int) -> int:
    return sum(heuristic_count(text, chars_per_token) for text in texts if text)


def count_anthropic_tokens(
    api_key: str,
    model_id: str,
    prompt: str,
    system_prompt: str | None,
) -> int:
    import anthropic

    client = anthropic.Anthropic(api_key=api_key, timeout=2.0)
    kwargs: dict[str, object] = {
        "model": model_id,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system_prompt:
        kwargs["system"] = system_prompt
    result = client.messages.count_tokens(**kwargs)
    return int(result.input_tokens)


def count_google_tokens(
    api_key: str,
    model_id: str,
    prompt: str,
    system_prompt: str | None,
) -> int:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    config = None
    if system_prompt:
        config = types.GenerateContentConfig(system_instruction=system_prompt)
    response = client.models.count_tokens(
        model=model_id,
        contents=prompt or " ",
        config=config,
    )
    return int(response.total_tokens)


class TokenizerService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def count(
        self,
        model: ModelSpec,
        prompt: str,
        system_prompt: str | None,
        *,
        remote: bool = True,
    ) -> TokenCount:
        pieces = [system_prompt or "", prompt or ""]
        spec = model.tokenizer
        if spec.startswith("tiktoken:"):
            encoding_name = spec.split(":", 1)[1]
            encoding = _encoding(encoding_name)
            total = sum(len(encoding.encode(text)) for text in pieces if text)
            return TokenCount(
                input_tokens=total,
                tokenizer_used=spec,
                is_exact=True,
            )

        if spec == "anthropic" and remote and prompt:
            key = self.settings.env_key_for("anthropic")
            if key:
                try:
                    total = count_anthropic_tokens(key, model.id, prompt, system_prompt)
                    return TokenCount(
                        input_tokens=total,
                        tokenizer_used="anthropic",
                        is_exact=True,
                    )
                except Exception:
                    return self._heuristic(
                        pieces,
                        "Anthropic count_tokens failed; used the ~4 characters/token heuristic.",
                    )
            return self._heuristic(
                pieces,
                "Anthropic count_tokens needs ANTHROPIC_API_KEY on the server; "
                "used the ~4 characters/token heuristic.",
            )

        if spec == "google" and remote and (prompt or system_prompt):
            key = self.settings.env_key_for("google")
            if key:
                try:
                    total = count_google_tokens(key, model.id, prompt, system_prompt)
                    return TokenCount(
                        input_tokens=total,
                        tokenizer_used="google",
                        is_exact=True,
                    )
                except Exception:
                    return self._heuristic(
                        pieces,
                        "Google count_tokens failed; used the ~4 characters/token heuristic.",
                    )
            return self._heuristic(
                pieces,
                "Google count_tokens needs GOOGLE_API_KEY on the server; "
                "used the ~4 characters/token heuristic.",
            )

        warning = None
        if spec in {"anthropic", "google"} and not remote:
            warning = (
                "Comparison uses the local ~4 characters/token heuristic for this model "
                "so the table stays fast. The single-model estimate uses the provider "
                "count endpoint when a server API key is configured."
            )
        elif spec == "heuristic":
            warning = "This model uses the approximate ~4 characters/token tokenizer."
        return self._heuristic(pieces, warning)

    def _heuristic(self, pieces: list[str], warning: str | None) -> TokenCount:
        warnings = [warning] if warning else []
        return TokenCount(
            input_tokens=_count_pieces(pieces, self.settings.chars_per_token),
            tokenizer_used="heuristic",
            is_exact=False,
            warnings=warnings,
        )
