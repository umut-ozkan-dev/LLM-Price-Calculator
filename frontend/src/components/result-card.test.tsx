import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResultCard } from "@/components/result-card";
import type { EstimateResponse } from "@/lib/types";

const estimate: EstimateResponse = {
  input_tokens: 1000,
  output_tokens: { low: 100, expected: 500, high: 2000 },
  cost_usd: { low: 0.0035, expected: 0.0075, high: 0.0225 },
  breakdown: {
    input_cost: 0.0025,
    output_cost_low: 0.001,
    output_cost_expected: 0.005,
    output_cost_high: 0.02,
  },
  model: {
    id: "gpt-4o",
    provider: "openai",
    display_name: "GPT-4o",
    input_price_per_1m_tokens: 2.5,
    output_price_per_1m_tokens: 10,
    cached_input_price_per_1m_tokens: 1.25,
    context_window: 128000,
    max_output_tokens: 16384,
    tokenizer: "tiktoken:o200k_base",
    last_updated: "2026-11-09",
    source_url: "https://developers.openai.com/api/docs/models/gpt-4o",
    api_endpoint: "chat_completions",
    completion_token_param: "max_tokens",
  },
  tokenizer_used: "tiktoken:o200k_base",
  is_tokenizer_exact: true,
  warnings: ["Prompt exceeds the context window."],
};

describe("ResultCard", () => {
  it("shows the expected cost, the range, and warnings", () => {
    render(
      <ResultCard estimate={estimate} isLoading={false} isError={false} isEmpty={false} />,
    );
    expect(screen.getByText("$0.007500")).toBeInTheDocument();
    expect(screen.getByText("$0.003500 – $0.0225")).toBeInTheDocument();
    expect(screen.getByText("1,000")).toBeInTheDocument();
    expect(screen.getByText("Prompt exceeds the context window.")).toBeInTheDocument();
  });

  it("shows an empty state before a prompt is entered", () => {
    render(<ResultCard estimate={null} isLoading={false} isError={false} isEmpty />);
    expect(screen.getByText("Paste a prompt to see what it would cost.")).toBeInTheDocument();
  });

  it("shows an error message", () => {
    render(
      <ResultCard
        estimate={null}
        isLoading={false}
        isError
        errorMessage="Model was not found."
        isEmpty={false}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Model was not found.");
  });
});
