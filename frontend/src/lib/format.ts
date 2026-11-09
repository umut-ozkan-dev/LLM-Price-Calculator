export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return "$0.00";
  if (abs >= 1) return `$${value.toFixed(2)}`;
  if (abs >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

export function formatPerMillion(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1) return `$${value.toFixed(2)}`;
  const trimmed = value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return `$${trimmed}`;
}

export function formatTokens(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function relativeCost(cost: number, selected: number): string {
  if (!Number.isFinite(cost) || !Number.isFinite(selected)) return "—";
  if (selected === 0) return cost === 0 ? "same cost" : "—";
  const delta = ((cost - selected) / selected) * 100;
  if (Math.abs(delta) < 0.5) return "same cost";
  const rounded = Math.abs(delta).toFixed(0);
  return delta < 0 ? `${rounded}% cheaper` : `${rounded}% more expensive`;
}
