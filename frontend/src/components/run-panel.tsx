"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { runPrompt } from "@/lib/api";
import { formatTokens, formatUsd } from "@/lib/format";
import type { EstimateResponse, RunResponse } from "@/lib/types";

type RunPanelProps = {
  prompt: string;
  systemPrompt: string;
  modelId: string;
  expectedOutputTokens: number | null;
  estimate: EstimateResponse | null;
};

export function RunPanel({
  prompt,
  systemPrompt,
  modelId,
  expectedOutputTokens,
  estimate,
}: RunPanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
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
      mutation.reset();
    }
  }

  function submit() {
    mutation.mutate({
      prompt,
      model_id: modelId,
      system_prompt: systemPrompt.trim() ? systemPrompt : null,
      max_output_tokens: expectedOutputTokens,
      api_key: apiKey.trim() ? apiKey.trim() : undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Run with an API key</CardTitle>
            <CardDescription>
              Optional. The key is sent once with this request and is not saved in the browser.
            </CardDescription>
          </div>
          <Switch checked={enabled} onCheckedChange={toggle} aria-label="Show API key input" />
        </div>
      </CardHeader>
      {enabled ? (
        <CardContent className="flex flex-col gap-3">
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            We don&apos;t store this key. It is not written to localStorage, logs, or the response.
            Leave it blank to use a key configured on the server.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-key">API key</Label>
            <Input
              id="api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-…"
            />
          </div>
          <Button type="button" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Running…" : "Run"}
          </Button>
          {mutation.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {mutation.error instanceof Error ? mutation.error.message : "The run failed."}
            </p>
          ) : null}
          {result ? <RunResult result={result} estimate={estimate} /> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

function RunResult({ result, estimate }: { result: RunResponse; estimate: EstimateResponse | null }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Actual cost</p>
          <p className="font-mono text-2xl">{formatUsd(result.cost_usd)}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Estimate {estimate ? formatUsd(estimate.cost_usd.expected) : "—"}
          <span className="mx-2">·</span>
          <span className="font-mono">{Math.round(result.latency_ms)} ms</span>
        </p>
      </div>
      <p className="font-mono text-xs text-muted-foreground">
        {formatTokens(result.usage.input_tokens)} in · {formatTokens(result.usage.output_tokens)} out
        {result.usage.cached_input_tokens
          ? ` · ${formatTokens(result.usage.cached_input_tokens)} cached`
          : ""}
      </p>
      {result.warnings.length > 0 ? (
        <ul className="text-xs text-amber-600 dark:text-amber-300">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed">
        {result.response_text || "The model returned an empty response."}
      </pre>
    </div>
  );
}
