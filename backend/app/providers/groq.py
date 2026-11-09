"""Groq OpenAI-compatible API, used here for hosted Llama models."""

from app.providers.openai import OpenAIProvider

GROQ_BASE_URL = "https://api.groq.com/openai/v1"


class GroqProvider(OpenAIProvider):
    def __init__(self) -> None:
        super().__init__(base_url=GROQ_BASE_URL)
