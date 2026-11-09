"""Run a prompt and price the provider-reported usage. API keys are never logged or stored."""

import logging
import time

from fastapi import HTTPException

from app.config import ENV_KEY_NAMES, Settings
from app.providers.registry import provider_for
from app.schemas import RunRequest, RunResponse, Usage
from app.services.catalog import get_catalog
from app.services.estimator import exact_usage_cost

logger = logging.getLogger("app.run")


def resolve_api_key(provider: str, request_key: str | None, settings: Settings) -> str:
    if request_key and request_key.strip():
        return request_key.strip()
    env_key = settings.env_key_for(provider)
    if env_key:
        return env_key
    env_name = ENV_KEY_NAMES.get(provider, "the provider API key")
    raise HTTPException(
        status_code=400,
        detail=(
            f"No API key available for {provider}. "
            f"Pass api_key in the request or set {env_name} on the server."
        ),
    )


def redact(message: str, secret: str) -> str:
    if secret and secret in message:
        message = message.replace(secret, "[redacted]")
    if len(message) > 400:
        return message[:400]
    return message


def resolve_max_output(
    requested: int | None, model_max: int, settings: Settings
) -> tuple[int, list[str]]:
    ceiling = min(settings.max_output_tokens_cap, model_max)
    if requested is None:
        return min(settings.default_max_output_tokens, ceiling), []
    if requested > ceiling:
        return ceiling, [
            f"max_output_tokens was capped at {ceiling} "
            f"(server cap {settings.max_output_tokens_cap}, model max {model_max})."
        ]
    return requested, []


def execute_run(body: RunRequest, settings: Settings) -> RunResponse:
    model = get_catalog().get(body.model_id)
    api_key = resolve_api_key(model.provider, body.api_key, settings)
    applied, warnings = resolve_max_output(
        body.max_output_tokens, model.max_output_tokens, settings
    )
    provider = provider_for(model)
    started = time.perf_counter()
    try:
        result = provider.complete(
            api_key=api_key,
            model_id=model.id,
            prompt=body.prompt,
            system_prompt=body.system_prompt,
            max_output_tokens=applied,
            completion_token_param=model.completion_token_param,
            api_endpoint=model.api_endpoint,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.info(
            "provider call failed model=%s provider=%s error_type=%s",
            model.id,
            model.provider,
            type(exc).__name__,
        )
        safe = redact(str(exc), api_key)
        raise HTTPException(status_code=502, detail=f"Provider request failed: {safe}") from None
    latency_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "provider call finished model=%s provider=%s input_tokens=%s output_tokens=%s",
        model.id,
        model.provider,
        result.input_tokens,
        result.output_tokens,
    )
    cost, cost_warnings = exact_usage_cost(
        model,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        cached_input_tokens=result.cached_input_tokens,
    )
    warnings.extend(cost_warnings)
    total = result.input_tokens + result.output_tokens
    return RunResponse(
        response_text=result.text,
        usage=Usage(
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            cached_input_tokens=result.cached_input_tokens,
            total_tokens=total,
        ),
        cost_usd=cost,
        model=model,
        latency_ms=round(latency_ms, 2),
        warnings=warnings,
    )
