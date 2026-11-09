"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { ProviderIcon } from "@/components/provider-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { runPrompt } from "@/lib/api";
import { formatTokens, formatUsd } from "@/lib/format";
import { PROVIDERS } from "@/lib/providers";
import type { EstimateResponse, ProviderName, RunResponse } from "@/lib/types";

type RunPanelProps = {
  prompt: string;
  systemPrompt: string;
  modelId: string;
  provider: ProviderName;
  expectedOutputTokens: number | null;
  estimate: EstimateResponse | null;
};

export function RunPanel({
  prompt,
  systemPrompt,
  modelId,
  provider,
  expectedOutputTokens,
  estimate,
}: RunPanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<RunResponse | null>(null);

  const mutation = useMutation({
    mutationFn: runPrompt,
    onSuccess: (data) => {
      setResult(data);
      setApiKey("");
    },
  });

  function toggle(next: boolean) {
    setEnabled(next);
    if (!next) {
      setApiKey("");
      setResult(null);
      setVisible(false);
      mutation.reset();
    }
  }

  return (
    <section className="surface-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-subtle text-primary">
            <Lock className="size-4" />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold">Run with an API key</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Sent once with this request. Not saved in the browser.
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} aria-label="Show API key input" />
      </div>
      {enabled ? (
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <ProviderIcon provider={provider} className="size-6" />
            Uses your {PROVIDERS[provider].label} key
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key">API key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={visible ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-…"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={visible ? "Hide API key" : "Show API key"}
                onClick={() => setVisible((current) => !current)}
              >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button type="button" className="h-10 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => submit()} disabled={mutation.isPending}>
            {mutation.isPending ? "Running…" : "Run prompt"}
          </Button>
          {mutation.isError ? (
            <p className="text-[15px] text-destructive" role="alert">
              {mutation.error instanceof Error ? mutation.error.message : "The run failed."}
            </p>
          ) : null}
          {result ? <RunResult result={result} estimate={estimate} /> : null}
        </div>
      ) : null}
    </section>
  );

  function submit() {
    mutation.mutate({
      prompt,
      model_id: modelId,
      system_prompt: systemPrompt.trim() ? systemPrompt : null,
      max_output_tokens: expectedOutputTokens,
      api_key: apiKey.trim() ? apiKey.trim() : undefined,
    });
  }
}

function RunResult({ result, estimate }: { result: RunResponse; estimate: EstimateResponse | null }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="grid gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-2">
        <div>
          <p className="text-[13px] text-muted-foreground">Actual</p>
          <p className="tabular font-mono text-2xl text-primary">{formatUsd(result.cost_usd)}</p>
        </div>
        <div>
          <p className="text-[13px] text-muted-foreground">Estimated</p>
          <p className="tabular font-mono text-2xl">{estimate ? formatUsd(estimate.cost_usd.expected) : "—"}</p>
        </div>
      </div>
      <p className="tabular font-mono text-[13px] text-muted-foreground">
        {formatTokens(result.usage.input_tokens)} in · {formatTokens(result.usage.output_tokens)} out
        {result.usage.cached_input_tokens ? ` · ${formatTokens(result.usage.cached_input_tokens)} cached` : ""}
        <span className="ml-2">{Math.round(result.latency_ms)} ms</span>
      </p>
      {result.warnings.length > 0 ? (
        <ul className="text-[13px] text-warning">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      <pre className="max-h-80 overflow-auto rounded-xl bg-background p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
        {result.response_text || "The model returned an empty response."}
      </pre>
    </div>
  );
}
