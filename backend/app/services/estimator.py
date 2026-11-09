"""Turn a prompt into a low / expected / high USD estimate."""

from decimal import Decimal

from app.config import Settings
from app.schemas import (
    CostBreakdown,
    CostRange,
    EstimateResponse,
    ModelSpec,
    TokenRange,
)
from app.services.money import decimal_price, to_money, token_cost
from app.services.tokenizer import TokenCount, TokenizerService


def active_prices(
    model: ModelSpec, input_tokens: int
) -> tuple[Decimal, Decimal, Decimal | None, bool]:
    """Return input price, output price, cached price, and whether long-context rates apply."""
    threshold = model.long_context_threshold
    long_context = (
        threshold is not None
        and input_tokens > threshold
        and model.long_context_input_price_per_1m_tokens is not None
        and model.long_context_output_price_per_1m_tokens is not None
    )
    if long_context:
        cached = model.long_context_cached_input_price_per_1m_tokens
        return (
            decimal_price(model.long_context_input_price_per_1m_tokens),  # type: ignore[arg-type]
            decimal_price(model.long_context_output_price_per_1m_tokens),  # type: ignore[arg-type]
            decimal_price(cached) if cached is not None else None,
            True,
        )
    cached = model.cached_input_price_per_1m_tokens
    return (
        decimal_price(model.input_price_per_1m_tokens),
        decimal_price(model.output_price_per_1m_tokens),
        decimal_price(cached) if cached is not None else None,
        False,
    )


def output_token_range(
    input_tokens: int,
    max_output_tokens: int,
    expected_output_tokens: int | None,
    settings: Settings,
) -> tuple[int, int, int]:
    cap = max(0, max_output_tokens)
    if expected_output_tokens is not None:
        clamped = min(max(0, expected_output_tokens), cap)
        return clamped, clamped, clamped

    low = min(
        cap,
        max(
            settings.estimate_output_low_min,
            round(settings.estimate_output_low_ratio * input_tokens),
        ),
    )
    expected = min(
        cap,
        max(
            settings.estimate_output_expected_min,
            round(settings.estimate_output_expected_ratio * input_tokens),
        ),
    )
    high = min(
        cap,
        max(round(settings.estimate_output_high_ratio * input_tokens), expected),
    )
    if expected < low:
        expected = low
    if high < expected:
        high = expected
    return low, expected, high


def exact_usage_cost(
    model: ModelSpec,
    *,
    input_tokens: int,
    output_tokens: int,
    cached_input_tokens: int,
) -> tuple[float, list[str]]:
    warnings: list[str] = []
    input_price, output_price, cached_price, _long = active_prices(model, input_tokens)
    cached = max(0, min(cached_input_tokens, input_tokens))
    uncached = input_tokens - cached
    if cached and cached_price is None:
        cached_price = input_price
        warnings.append(
            "This model has no cached-input price; cached tokens were billed "
            "at the standard input rate."
        )
    price = cached_price if cached_price is not None else input_price
    total = (
        token_cost(uncached, input_price)
        + token_cost(cached, price)
        + token_cost(output_tokens, output_price)
    )
    return to_money(total), warnings


def build_estimate(
    model: ModelSpec,
    counted: TokenCount,
    expected_output_tokens: int | None,
    settings: Settings,
) -> EstimateResponse:
    warnings = list(counted.warnings)
    if expected_output_tokens is not None and expected_output_tokens > model.max_output_tokens:
        warnings.append(
            f"Expected output was capped at {model.display_name}'s max output of "
            f"{model.max_output_tokens:,} tokens."
        )

    low, expected, high = output_token_range(
        counted.input_tokens,
        model.max_output_tokens,
        expected_output_tokens,
        settings,
    )
    input_price, output_price, _cached, long_context = active_prices(model, counted.input_tokens)
    input_cost = token_cost(counted.input_tokens, input_price)
    output_low = token_cost(low, output_price)
    output_expected = token_cost(expected, output_price)
    output_high = token_cost(high, output_price)

    if counted.input_tokens > model.context_window:
        warnings.append(
            f"Prompt is {counted.input_tokens:,} tokens, which exceeds {model.display_name}'s "
            f"context window of {model.context_window:,} tokens."
        )
    elif counted.input_tokens + high > model.context_window:
        warnings.append(
            f"Input plus the high output estimate ({counted.input_tokens + high:,} tokens) "
            f"exceeds the {model.context_window:,}-token context window."
        )

    if model.max_input_tokens is not None and counted.input_tokens > model.max_input_tokens:
        warnings.append(
            f"Prompt is {counted.input_tokens:,} tokens, above this model's published "
            f"maximum input of {model.max_input_tokens:,} tokens."
        )

    if long_context and model.long_context_threshold is not None:
        warnings.append(
            f"Input exceeds {model.long_context_threshold:,} tokens, so long-context rates apply "
            "to the whole request."
        )

    if not counted.is_exact:
        warnings.append("Token count is approximate.")

    # Preserve order while dropping duplicates.
    deduped: list[str] = []
    for warning in warnings:
        if warning not in deduped:
            deduped.append(warning)

    return EstimateResponse(
        input_tokens=counted.input_tokens,
        output_tokens=TokenRange(low=low, expected=expected, high=high),
        cost_usd=CostRange(
            low=to_money(input_cost + output_low),
            expected=to_money(input_cost + output_expected),
            high=to_money(input_cost + output_high),
        ),
        breakdown=CostBreakdown(
            input_cost=to_money(input_cost),
            output_cost_low=to_money(output_low),
            output_cost_expected=to_money(output_expected),
            output_cost_high=to_money(output_high),
        ),
        model=model,
        tokenizer_used=counted.tokenizer_used,
        is_tokenizer_exact=counted.is_exact,
        warnings=deduped,
    )


def estimate_prompt(
    model: ModelSpec,
    prompt: str,
    system_prompt: str | None,
    expected_output_tokens: int | None,
    settings: Settings,
    tokenizer: TokenizerService,
    *,
    remote_tokenizer: bool,
) -> EstimateResponse:
    counted = tokenizer.count(model, prompt, system_prompt, remote=remote_tokenizer)
    return build_estimate(model, counted, expected_output_tokens, settings)
