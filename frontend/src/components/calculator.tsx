"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { ComparisonTable } from "@/components/comparison-table";
import { ModelSelector } from "@/components/model-selector";
import { OutputLength } from "@/components/output-length";
import { PromptEditor } from "@/components/prompt-editor";
import { ResultCard } from "@/components/result-card";
import { RunPanel } from "@/components/run-panel";
import { compareCosts, estimateCost, fetchCatalog } from "@/lib/api";
import { approximateTokens } from "@/lib/tokens";
import { useDebouncedValue } from "@/lib/use-debounced";

const DEFAULT_MODEL = "gpt-4o-mini";

export function Calculator() {
  const [prompt, setPrompt] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [modelId, setModelId] = useState(DEFAULT_MODEL);
  const [autoOutput, setAutoOutput] = useState(true);
  const [outputTokens, setOutputTokens] = useState(300);

  const debouncedPrompt = useDebouncedValue(prompt, 300);
  const debouncedSystem = useDebouncedValue(systemPrompt, 300);
  const hasText = debouncedPrompt.trim().length > 0 || debouncedSystem.trim().length > 0;
  const expected = autoOutput ? null : outputTokens;

  const catalog = useQuery({ queryKey: ["models"], queryFn: fetchCatalog });
  const models = useMemo(() => catalog.data?.models ?? [], [catalog.data]);
  const selected = models.find((model) => model.id === modelId) ?? models[0];
  const activeModelId = selected?.id ?? modelId;

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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <div className="max-w-2xl">
        <p className="text-xs font-medium tracking-[0.14em] text-primary uppercase">USD, before you send it</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          What will this prompt cost?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Count the tokens, price a low / expected / high range, and see which model is cheaper for the
          same text. List prices are from the catalog dated {catalog.data?.version ?? "…"}.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <div className="flex flex-col gap-6">
          <PromptEditor
            prompt={prompt}
            onPromptChange={setPrompt}
            systemPrompt={systemPrompt}
            onSystemPromptChange={setSystemPrompt}
            charCount={prompt.length + systemPrompt.length}
            tokenCount={tokenCount}
            tokenApprox={tokenApprox || !hasText}
          />
          {catalog.isError ? (
            <p className="text-sm text-destructive" role="alert">
              Could not load the model catalog. Is the API running at the configured URL?
            </p>
          ) : (
            <ModelSelector
              models={models}
              value={activeModelId}
              onChange={setModelId}
              isLoading={catalog.isLoading}
            />
          )}
          <OutputLength
            auto={autoOutput}
            onAutoChange={setAutoOutput}
            value={outputTokens}
            onValueChange={setOutputTokens}
            max={selected?.max_output_tokens ?? 8192}
          />
          <RunPanel
            key={activeModelId}
            prompt={prompt}
            systemPrompt={systemPrompt}
            modelId={activeModelId}
            expectedOutputTokens={expected}
            estimate={estimate.data ?? null}
          />
        </div>
        <ResultCard
          estimate={estimate.data ?? null}
          isLoading={estimate.isFetching}
          isError={estimate.isError}
          errorMessage={estimate.error instanceof Error ? estimate.error.message : undefined}
          isEmpty={!hasText}
        />
      </div>

      <ComparisonTable
        rows={comparison.data?.results ?? []}
        selectedId={activeModelId}
        isLoading={comparison.isFetching}
        isEmpty={!hasText}
        onSelect={setModelId}
      />
    </div>
  );
}
