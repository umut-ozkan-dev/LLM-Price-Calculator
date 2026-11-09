"""USD helpers. Prices are per 1M tokens; results are rounded to 1e-8 USD."""

from decimal import ROUND_HALF_UP, Decimal

MONEY_QUANT = Decimal("0.00000001")


def decimal_price(value: float) -> Decimal:
    return Decimal(str(value))


def token_cost(tokens: int, price_per_1m: Decimal) -> Decimal:
    if tokens <= 0:
        return Decimal(0)
    return (Decimal(tokens) * price_per_1m) / Decimal(1_000_000)


def to_money(value: Decimal) -> float:
    return float(value.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP))
