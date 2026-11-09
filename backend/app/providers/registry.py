"""Map a catalog provider name to its client."""

from app.providers.anthropic import AnthropicProvider
from app.providers.base import LLMProvider
from app.providers.deepseek import DeepSeekProvider
from app.providers.google import GoogleProvider
from app.providers.groq import GroqProvider
from app.providers.mistral import MistralProvider
from app.providers.openai import OpenAIProvider
from app.schemas import ModelSpec


def provider_for(model: ModelSpec) -> LLMProvider:
    if model.provider == "openai":
        return OpenAIProvider()
    if model.provider == "anthropic":
        return AnthropicProvider()
    if model.provider == "google":
        return GoogleProvider()
    if model.provider == "mistral":
        return MistralProvider()
    if model.provider == "deepseek":
        return DeepSeekProvider()
    if model.provider == "groq":
        return GroqProvider()
    raise ValueError(f"No provider implementation for '{model.provider}'.")
