"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { ComparisonTable } from "@/components/comparison-table";
import { ModelSelector } from "@/components/model-selector";
import { OutputLength, OUTPUT_PRESETS, type OutputMode } from "@/components/output-length";
import { PromptEditor } from "@/components/prompt-editor";
import { ResultCard } from "@/components/result-card";
import { RunPanel } from "@/components/run-panel";
import { compareCosts, estimateCost, fetchCatalog } from "@/lib/api";
import { formatTokens, formatUsd, relativeCost } from "@/lib/format";
import { approximateTokens } from "@/lib/tokens";
import { useDebouncedValue } from "@/lib/use-debounced";
import type { ProviderName } from "@/lib/types";

const DEFAULT_MODEL = "gpt-4o-mini";

export function Calculator() {
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [modelId, setModelId] = useState(DEFAULT_MODEL);
  const [outputMode, setOutputMode] = useState<OutputMode>("auto");
  const [customTokens, setCustomTokens] = useState(300);
  const [sheetOpen, setSheetOpen] = useState(false);

  const debouncedPrompt = useDebouncedValue(prompt, 300);
  const debouncedSystem = useDebouncedValue(systemPrompt, 300);
  const hasText = debouncedPrompt.trim().length > 0 || debouncedSystem.trim().length > 0;

  const catalog = useQuery({ queryKey: ["models"], queryFn: fetchCatalog });
  const models = useMemo(() => catalog.data?.models ?? [], [catalog.data]);
  const selected = models.find((model) => model.id === modelId) ?? models[0];
  const activeModelId = selected?.id ?? modelId;
  const provider = (selected?.provider ?? "openai") as ProviderName;
  const maxOutput = selected?.max_output_tokens ?? 8192;
  const expected = expectedTokens(outputMode, customTokens, maxOutput);

  const estimate = useQuery({
    queryKey: ["estimate", activeModelId, debouncedPrompt, debouncedSystem, expected],
    queryFn: () =>
      estimateCost({
        prompt: debouncedPrompt,
        model_id: activeModelId,
        system_prompt: debouncedSystem.trim() ? debouncedSystem : null,
        expected_output_tokens: expected,
      }),
    enabled: hasText && Boolean(activeModelId) && !catalog.isLoading,
  });

  const comparison = useQuery({
    queryKey: ["compare", debouncedPrompt, debouncedSystem, expected],
    queryFn: () =>
      compareCosts({
        prompt: debouncedPrompt,
        system_prompt: debouncedSystem.trim() ? debouncedSystem : null,
        expected_output_tokens: expected,
      }),
    enabled: hasText,
  });

  const localTokens = approximateTokens(`${debouncedSystem}\n${debouncedPrompt}`.trim());
  const tokenCount = estimate.data?.input_tokens ?? localTokens;
  const tokenApprox = !estimate.data || !estimate.data.is_tokenizer_exact;
  const cheapest = [...(comparison.data?.results ?? [])].sort(
    (a, b) => a.cost_usd.expected - b.cost_usd.expected,
  )[0];
  const selectedCost = estimate.data?.cost_usd.expected;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 py-10 pb-28 sm:px-6 lg:gap-16 lg:pb-16">
      <header className="max-w-3xl">
        <p className="text-[13px] font-semibold tracking-[0.16em] text-primary uppercase">USD, before you send it</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">What will this prompt cost?</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          Price a low, expected, and high range, then see which model is cheaper for the same text.
          Catalog dated {catalog.data?.version ?? "…"}.
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <PromptEditor
            prompt={prompt}
            onPromptChange={setPrompt}
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
            charCount={prompt.length + systemPrompt.length}
            tokenCount={hasText ? tokenCount : 0}
            tokenApprox={tokenApprox || !hasText}
          />
          {catalog.isError ? (
            <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4" role="alert">
              <p className="text-[15px] text-destructive">Could not load the model catalog.</p>
              <button type="button" className="text-[15px] font-medium text-primary" onClick={() => catalog.refetch()}>
                Retry
              </button>
            </div>
          ) : (
            <ModelSelector models={models} value={activeModelId} onChange={setModelId} isLoading={catalog.isLoading} />
          )}
          <div className="lg:hidden">
            <ResultCard
              estimate={estimate.data ?? null}
              isLoading={estimate.isFetching}
              isError={estimate.isError}
              errorMessage={estimate.error instanceof Error ? estimate.error.message : undefined}
              isEmpty={!hasText}
              onRetry={() => estimate.refetch()}
            />
          </div>
          <OutputLength
            mode={outputMode}
            onModeChange={setOutputMode}
            value={customTokens}
            onValueChange={setCustomTokens}
            max={maxOutput}
          />
          <RunPanel
            key={activeModelId}
            prompt={prompt}
            systemPrompt={systemPrompt}
            modelId={activeModelId}
            provider={provider}
            expectedOutputTokens={expected}
            estimate={estimate.data ?? null}
          />
        </div>
        <div className="hidden flex-col gap-4 lg:col-span-5 lg:flex lg:sticky lg:top-24">
          <ResultCard
            estimate={estimate.data ?? null}
            isLoading={estimate.isFetching}
            isError={estimate.isError}
            errorMessage={estimate.error instanceof Error ? estimate.error.message : undefined}
            isEmpty={!hasText}
            onRetry={() => estimate.refetch()}
          />
          {cheapest && selectedCost !== undefined ? (
            <button
              type="button"
              className="surface-card p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setModelId(cheapest.model.id)}
            >
              <p className="text-[13px] font-medium text-muted-foreground">Cheapest for this prompt</p>
              <p className="mt-1 text-[15px] font-semibold">{cheapest.model.display_name}</p>
              <p className="tabular mt-1 font-mono text-primary">
                {formatUsd(cheapest.cost_usd.expected)}
                <span className="ml-2 text-[13px] text-success">
                  {cheapest.model.id === activeModelId
                    ? "This is the model you selected"
                    : relativeCost(cheapest.cost_usd.expected, selectedCost)}
                </span>
              </p>
            </button>
          ) : null}
        </div>
      </div>

      <ComparisonTable
        rows={comparison.data?.results ?? []}
        selectedId={activeModelId}
        isLoading={comparison.isFetching}
        isEmpty={!hasText}
        onSelect={setModelId}
      />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          aria-expanded={sheetOpen}
          onClick={() => setSheetOpen((open) => !open)}
        >
          <span className="tabular font-mono text-lg text-primary">
            {estimate.data ? formatUsd(estimate.data.cost_usd.expected) : "$0.00"}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {formatTokens(hasText ? tokenCount : 0)} tokens · {selected?.display_name ?? "Choose a model"}
          </span>
        </button>
        {sheetOpen ? (
          <div className="mt-3 max-h-[50vh] overflow-auto">
            <ResultCard
              estimate={estimate.data ?? null}
              isLoading={estimate.isFetching}
              isError={estimate.isError}
              errorMessage={estimate.error instanceof Error ? estimate.error.message : undefined}
              isEmpty={!hasText}
              onRetry={() => estimate.refetch()}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function expectedTokens(mode: OutputMode, custom: number, max: number): number | null {
  if (mode === "auto") return null;
  if (mode === "custom") return Math.min(Math.max(0, custom), max);
  return Math.min(OUTPUT_PRESETS[mode], max);
}
