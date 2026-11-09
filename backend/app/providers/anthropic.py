"""Anthropic Messages API."""

from app.providers.base import ProviderResult


class AnthropicProvider:
    def complete(
        self,
        *,
        api_key: str,
        model_id: str,
        prompt: str,
        system_prompt: str | None,
        max_output_tokens: int,
        completion_token_param: str = "max_tokens",
        api_endpoint: str = "chat_completions",
    ) -> ProviderResult:
        del completion_token_param, api_endpoint
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        kwargs: dict[str, object] = {
            "model": model_id,
            "max_tokens": max_output_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            kwargs["system"] = system_prompt
        response = client.messages.create(**kwargs)
        parts: list[str] = []
        for block in response.content:
            text = getattr(block, "text", None)
            if text:
                parts.append(text)
        usage = response.usage
        cached = int(getattr(usage, "cache_read_input_tokens", 0) or 0)
        return ProviderResult(
            text="".join(parts),
            input_tokens=int(usage.input_tokens),
            output_tokens=int(usage.output_tokens),
            cached_input_tokens=cached,
        )
