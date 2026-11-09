"""Provider interface. One subclass per vendor, plus OpenAI-compatible hosts."""

from dataclasses import dataclass
from typing import Protocol


@dataclass
class ProviderResult:
    text: str
    input_tokens: int
    output_tokens: int
    cached_input_tokens: int = 0


class LLMProvider(Protocol):
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
    ) -> ProviderResult: ...
