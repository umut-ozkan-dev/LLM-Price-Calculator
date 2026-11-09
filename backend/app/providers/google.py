"""Google Gemini via the google-genai SDK."""

from app.providers.base import ProviderResult


class GoogleProvider:
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
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        config = types.GenerateContentConfig(
            max_output_tokens=max_output_tokens,
            system_instruction=system_prompt or None,
        )
        response = client.models.generate_content(
            model=model_id,
            contents=prompt,
            config=config,
        )
        meta = response.usage_metadata
        return ProviderResult(
            text=response.text or "",
            input_tokens=int(getattr(meta, "prompt_token_count", 0) or 0),
            output_tokens=int(getattr(meta, "candidates_token_count", 0) or 0),
            cached_input_tokens=int(getattr(meta, "cached_content_token_count", 0) or 0),
        )
