"""OpenAI Chat Completions and Responses, also used by compatible hosts."""

from app.providers.base import ProviderResult


class OpenAIProvider:
    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = base_url

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
        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url=self.base_url)
        if api_endpoint == "responses":
            return self._responses(
                client,
                model_id=model_id,
                prompt=prompt,
                system_prompt=system_prompt,
                max_output_tokens=max_output_tokens,
            )
        return self._chat(
            client,
            model_id=model_id,
            prompt=prompt,
            system_prompt=system_prompt,
            max_output_tokens=max_output_tokens,
            completion_token_param=completion_token_param,
        )

    def _chat(
        self,
        client: object,
        *,
        model_id: str,
        prompt: str,
        system_prompt: str | None,
        max_output_tokens: int,
        completion_token_param: str,
    ) -> ProviderResult:
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        kwargs: dict[str, object] = {"model": model_id, "messages": messages}
        kwargs[completion_token_param] = max_output_tokens
        response = client.chat.completions.create(**kwargs)  # type: ignore[attr-defined]
        usage = response.usage
        details = getattr(usage, "prompt_tokens_details", None)
        cached = int(getattr(details, "cached_tokens", 0) or 0)
        content = response.choices[0].message.content if response.choices else ""
        return ProviderResult(
            text=content or "",
            input_tokens=int(getattr(usage, "prompt_tokens", 0) or 0),
            output_tokens=int(getattr(usage, "completion_tokens", 0) or 0),
            cached_input_tokens=cached,
        )

    def _responses(
        self,
        client: object,
        *,
        model_id: str,
        prompt: str,
        system_prompt: str | None,
        max_output_tokens: int,
    ) -> ProviderResult:
        kwargs: dict[str, object] = {
            "model": model_id,
            "input": prompt,
            "max_output_tokens": max_output_tokens,
        }
        if system_prompt:
            kwargs["instructions"] = system_prompt
        response = client.responses.create(**kwargs)  # type: ignore[attr-defined]
        usage = response.usage
        details = getattr(usage, "input_tokens_details", None)
        cached = int(getattr(details, "cached_tokens", 0) or 0)
        return ProviderResult(
            text=getattr(response, "output_text", None) or "",
            input_tokens=int(getattr(usage, "input_tokens", 0) or 0),
            output_tokens=int(getattr(usage, "output_tokens", 0) or 0),
            cached_input_tokens=cached,
        )
