import pytest

from app.config import Settings
from app.services.catalog import get_catalog
from app.services.estimator import (
    active_prices,
    build_estimate,
    exact_usage_cost,
    output_token_range,
)
from app.services.money import decimal_price
from app.services.tokenizer import TokenCount


def test_output_heuristic_defaults():
    settings = Settings()
    assert output_token_range(1000, 100_000, None, settings) == (100, 500, 2000)


def test_output_heuristic_applies_minimums_then_caps():
    settings = Settings()
    assert output_token_range(10, 80, None, settings) == (50, 80, 80)
    assert output_token_range(10, 40, None, settings) == (40, 40, 40)


def test_explicit_output_is_a_point_estimate():
    settings = Settings()
    assert output_token_range(1000, 100_000, 42, settings) == (42, 42, 42)
    assert output_token_range(1000, 30, 100, settings) == (30, 30, 30)


def test_hand_computed_gpt4o_cost():
    """1,000 input tokens and the auto range on GPT-4o ($2.50 / $10 per 1M).

    input = 1000 * 2.50 / 1e6 = 0.0025
    low output 100 * 10 / 1e6 = 0.001 -> total 0.0035
    expected output 500 * 10 / 1e6 = 0.005 -> total 0.0075
    high output 2000 * 10 / 1e6 = 0.02 -> total 0.0225
    """
    model = get_catalog().get("gpt-4o")
    counted = TokenCount(input_tokens=1000, tokenizer_used="tiktoken:o200k_base", is_exact=True)
    estimate = build_estimate(model, counted, None, Settings())
    assert estimate.output_tokens.low == 100
    assert estimate.output_tokens.expected == 500
    assert estimate.output_tokens.high == 2000
    assert estimate.breakdown.input_cost == pytest.approx(0.0025)
    assert estimate.breakdown.output_cost_low == pytest.approx(0.001)
    assert estimate.breakdown.output_cost_expected == pytest.approx(0.005)
    assert estimate.breakdown.output_cost_high == pytest.approx(0.02)
    assert estimate.cost_usd.low == pytest.approx(0.0035)
    assert estimate.cost_usd.expected == pytest.approx(0.0075)
    assert estimate.cost_usd.high == pytest.approx(0.0225)


def test_million_tokens_is_the_sticker_price():
    """Mistral Large 4 is $0.70 / $2.10 per 1M, and its max output covers 1M tokens."""
    model = get_catalog().get("mistral-large-4")
    counted = TokenCount(1_000_000, "heuristic", False)
    estimate = build_estimate(model, counted, 1_000_000, Settings())
    assert estimate.breakdown.input_cost == pytest.approx(0.7)
    assert estimate.breakdown.output_cost_expected == pytest.approx(2.1)
    assert estimate.cost_usd.expected == pytest.approx(2.8)


def test_long_context_rate_switch():
    model = get_catalog().get("gpt-5.4")
    short_in, short_out, _cached, long = active_prices(model, 1000)
    assert long is False
    assert short_in == decimal_price(2.5)
    assert short_out == decimal_price(15)
    long_in, long_out, long_cached, is_long = active_prices(model, 272001)
    assert is_long is True
    assert long_in == decimal_price(5)
    assert long_out == decimal_price(22.5)
    assert long_cached == decimal_price(0.5)


def test_exact_usage_splits_cached_tokens():
    """GPT-4o: 800 uncached * $2.50 + 200 cached * $1.25 + 500 output * $10, per 1M.

    0.002 + 0.00025 + 0.005 = 0.00725
    """
    model = get_catalog().get("gpt-4o")
    cost, warnings = exact_usage_cost(
        model, input_tokens=1000, output_tokens=500, cached_input_tokens=200
    )
    assert cost == pytest.approx(0.00725)
    assert warnings == []


def test_context_window_warning():
    model = get_catalog().get("gpt-4o-mini")
    counted = TokenCount(model.context_window + 1, "tiktoken:o200k_base", True)
    estimate = build_estimate(model, counted, 10, Settings())
    assert any("context window" in warning for warning in estimate.warnings)


def test_estimate_endpoint_contract(client):
    response = client.post(
        "/api/estimate",
        json={"prompt": "Say hello in one short sentence.", "model_id": "gpt-4o-mini"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["is_tokenizer_exact"] is True
    assert body["tokenizer_used"] == "tiktoken:o200k_base"
    assert body["input_tokens"] > 0
    assert body["cost_usd"]["low"] <= body["cost_usd"]["expected"] <= body["cost_usd"]["high"]
    assert set(body["breakdown"]) == {
        "input_cost",
        "output_cost_low",
        "output_cost_expected",
        "output_cost_high",
    }


def test_compare_is_sorted_and_covers_catalog(client):
    response = client.post(
        "/api/estimate/compare",
        json={"prompt": "Compare prices for this prompt.", "model_ids": None},
    )
    assert response.status_code == 200
    results = response.json()["results"]
    catalog = client.get("/api/models").json()["models"]
    assert len(results) == len(catalog)
    costs = [item["cost_usd"]["expected"] for item in results]
    assert costs == sorted(costs)


def test_unknown_model_is_404(client):
    response = client.post("/api/estimate", json={"prompt": "hi", "model_id": "nope"})
    assert response.status_code == 404
