import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ComparisonTable } from "@/components/comparison-table";
import type { EstimateResponse } from "@/lib/types";

function row(
  id: string,
  name: string,
  cost: number,
  provider: EstimateResponse["model"]["provider"] = "openai",
): EstimateResponse {
  return {
    input_tokens: 100,
    output_tokens: { low: 50, expected: 150, high: 200 },
    cost_usd: { low: cost, expected: cost, high: cost },
    breakdown: {
      input_cost: cost / 2,
      output_cost_low: cost / 2,
      output_cost_expected: cost / 2,
      output_cost_high: cost / 2,
    },
    model: {
      id,
      provider,
      display_name: name,
      input_price_per_1m_tokens: 1,
      output_price_per_1m_tokens: 2,
      context_window: 1000,
      max_output_tokens: 1000,
      tokenizer: "heuristic",
      last_updated: "2026-11-09",
      source_url: "https://example.com",
      api_endpoint: "chat_completions",
      completion_token_param: "max_tokens",
    },
    tokenizer_used: "heuristic",
    is_tokenizer_exact: false,
    warnings: [],
  };
}

const rows = [
  row("expensive", "Alpha", 0.004),
  row("selected", "Middle", 0.002, "anthropic"),
  row("cheap", "Zulu", 0.001, "google"),
];

describe("ComparisonTable", () => {
  it("sorts by expected cost and highlights the cheapest model", () => {
    render(
      <ComparisonTable
        rows={rows}
        selectedId="selected"
        isLoading={false}
        isEmpty={false}
        onSelect={() => undefined}
      />,
    );
    const names = screen.getAllByRole("button", { name: /Alpha|Middle|Zulu/ }).map((node) => node.textContent);
    expect(names[0]).toContain("Zulu");
    expect(names[0]).toContain("Cheapest");
    expect(names[1]).toContain("Selected");
    expect(screen.getByText("50% cheaper")).toBeInTheDocument();
    expect(screen.getByText("100% more expensive")).toBeInTheDocument();
  });

  it("can sort by model name", async () => {
    const user = userEvent.setup();
    render(
      <ComparisonTable
        rows={rows}
        selectedId="selected"
        isLoading={false}
        isEmpty={false}
        onSelect={() => undefined}
      />,
    );
    const table = screen.getByRole("table");
    await user.click(within(table).getByRole("button", { name: "Sort by Model" }));
    const names = within(table)
      .getAllByRole("button", { name: /Alpha|Middle|Zulu/ })
      .map((node) => node.textContent);
    expect(names).toHaveLength(3);
    expect(names[0]).toMatch(/^Alpha/);
    expect(names[1]).toMatch(/^Middle/);
    expect(names[2]).toMatch(/^Zulu/);
  });

  it("shows an empty state", () => {
    render(
      <ComparisonTable rows={[]} selectedId="selected" isLoading={false} isEmpty onSelect={() => undefined} />,
    );
    expect(screen.getByText("Paste a prompt to compare every model.")).toBeInTheDocument();
  });
});
