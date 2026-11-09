"""Mistral La Plateforme, OpenAI-compatible chat completions."""

from app.providers.openai import OpenAIProvider

MISTRAL_BASE_URL = "https://api.mistral.ai/v1"


class MistralProvider(OpenAIProvider):
    def __init__(self) -> None:
        super().__init__(base_url=MISTRAL_BASE_URL)
