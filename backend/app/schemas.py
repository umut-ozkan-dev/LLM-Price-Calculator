"""Pydantic models shared by the catalog, estimate, and run APIs."""

from typing import Literal

from pydantic import BaseModel, Field

ProviderName = Literal["openai", "anthropic", "google", "mistral", "deepseek", "groq"]
ApiEndpoint = Literal["chat_completions", "responses"]
CompletionTokenParam = Literal["max_tokens", "max_completion_tokens"]


class ModelSpec(BaseModel):
    id: str
    provider: ProviderName
    display_name: str
    input_price_per_1m_tokens: float
    output_price_per_1m_tokens: float
    cached_input_price_per_1m_tokens: float | None = None
    context_window: int
    max_output_tokens: int
    tokenizer: str
    last_updated: str
    source_url: str
    notes: str | None = None
    long_context_threshold: int | None = None
    long_context_input_price_per_1m_tokens: float | None = None
    long_context_output_price_per_1m_tokens: float | None = None
    long_context_cached_input_price_per_1m_tokens: float | None = None
    max_input_tokens: int | None = None
    api_endpoint: ApiEndpoint = "chat_completions"
    completion_token_param: CompletionTokenParam = "max_tokens"


class CatalogResponse(BaseModel):
    version: str
    models: list[ModelSpec]


class EstimateRequest(BaseModel):
    prompt: str = ""
    model_id: str
    expected_output_tokens: int | None = Field(default=None, ge=0)
    system_prompt: str | None = None


class CompareRequest(BaseModel):
    prompt: str = ""
    model_id: str | None = None
    expected_output_tokens: int | None = Field(default=None, ge=0)
    system_prompt: str | None = None
    model_ids: list[str] | None = None


class TokenRange(BaseModel):
    low: int
    expected: int
    high: int


class CostRange(BaseModel):
    low: float
    expected: float
    high: float


class CostBreakdown(BaseModel):
    input_cost: float
    output_cost_low: float
    output_cost_expected: float
    output_cost_high: float


class EstimateResponse(BaseModel):
    input_tokens: int
    output_tokens: TokenRange
    cost_usd: CostRange
    breakdown: CostBreakdown
    model: ModelSpec
    tokenizer_used: str
    is_tokenizer_exact: bool
    warnings: list[str]


class CompareResponse(BaseModel):
    results: list[EstimateResponse]


class RunRequest(BaseModel):
    prompt: str = Field(min_length=1)
    model_id: str
    system_prompt: str | None = None
    max_output_tokens: int | None = Field(default=None, ge=1)
    api_key: str | None = None


class Usage(BaseModel):
    input_tokens: int
    output_tokens: int
    cached_input_tokens: int = 0
    total_tokens: int


class RunResponse(BaseModel):
    response_text: str
    usage: Usage
    cost_usd: float
    model: ModelSpec
    latency_ms: float
    warnings: list[str] = []
