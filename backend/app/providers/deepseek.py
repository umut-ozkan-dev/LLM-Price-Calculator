"""DeepSeek's OpenAI-compatible API."""

from app.providers.openai import OpenAIProvider

DEEPSEEK_BASE_URL = "https://api.deepseek.com"


class DeepSeekProvider(OpenAIProvider):
    def __init__(self) -> None:
        super().__init__(base_url=DEEPSEEK_BASE_URL)
