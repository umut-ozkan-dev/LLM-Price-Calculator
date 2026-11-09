"use client";

import { ProviderIcon } from "@/components/provider-icon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTokens, formatUsd } from "@/lib/format";
import { useCountUp } from "@/lib/use-count-up";
import type { EstimateResponse } from "@/lib/types";

type ResultCardProps = {
  estimate: EstimateResponse | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  isEmpty: boolean;
  onRetry?: () => void;
};

export function ResultCard({ estimate, isLoading, isError, errorMessage, isEmpty, onRetry }: ResultCardProps) {
  const target = !isEmpty && estimate ? estimate.cost_usd.expected : 0;
  const animated = useCountUp(target);
  const display = !isEmpty && estimate && animated === target ? formatUsd(estimate.cost_usd.expected) : formatUsd(animated);

  return (
    <section id="estimate-result" className="surface-card relative overflow-hidden p-6 sm:p-7" aria-live="polite">
      <div className="pointer-events-none absolute -top-16 right-0 size-48 rounded-full bg-primary/15 blur-3xl" />
      <p className="text-[13px] font-medium tracking-wide text-muted-foreground uppercase">Expected cost</p>
      <p
        className={`tabular mt-2 font-mono text-6xl font-medium tracking-tight text-primary sm:text-7xl ${isEmpty ? "opacity-30" : ""}`}
      >
        {isLoading && !estimate ? "…" : isEmpty ? "$0.00" : display}
      </p>
      {isEmpty ? (
        <p className="mt-4 max-w-sm text-[15px] text-muted-foreground">Paste a prompt to see what it would cost.</p>
      ) : null}
      {isError ? (
        <div className="mt-4 flex flex-wrap items-center gap-3" role="alert">
          <p className="text-[15px] text-destructive">{errorMessage || "The estimate could not be calculated."}</p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
      {isLoading && !estimate && !isEmpty ? (
        <div className="mt-6 flex flex-col gap-3" aria-busy="true">
          <span className="sr-only">Estimating</span>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}
      {estimate && !isEmpty ? <EstimateBody estimate={estimate} /> : null}
    </section>
  );
}

function EstimateBody({ estimate }: { estimate: EstimateResponse }) {
  const { low, expected, high } = estimate.cost_usd;
  const span = Math.max(high - low, 0.0000001);
  const marker = ((expected - low) / span) * 100;
  const input = estimate.breakdown.input_cost;
  const output = estimate.breakdown.output_cost_expected;
  const total = input + output;
  const inputShare = total > 0 ? (input / total) * 100 : 0;

  return (
    <div className="relative mt-6 flex flex-col gap-5">
      <div>
        <div className="relative h-2 rounded-full bg-foreground/15">
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary/70" style={{ width: `${Math.min(100, Math.max(8, marker))}%` }} />
          <span className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full border-2 border-primary bg-card" style={{ left: `calc(${marker}% - 7px)` }} />
        </div>
        <div className="tabular mt-2 flex justify-between font-mono text-[13px] text-muted-foreground">
          <span>Low {formatUsd(low)}</span>
          <span>Expected {formatUsd(expected)}</span>
          <span>High {formatUsd(high)}</span>
        </div>
        <p className="sr-only">{`${formatUsd(low)} – ${formatUsd(high)}`}</p>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-[15px]">
        <Stat label="Input tokens" value={formatTokens(estimate.input_tokens)} />
        <Stat
          label="Output tokens"
          value={`${formatTokens(estimate.output_tokens.low)}–${formatTokens(estimate.output_tokens.high)}`}
        />
        <Stat label="Input cost" value={formatUsd(input)} />
        <Stat label="Output cost" value={formatUsd(output)} />
      </dl>
      <div>
        <div
          className="flex h-3 overflow-hidden rounded-full bg-foreground/10"
          role="img"
          aria-label={`Input cost ${formatUsd(input)}, output cost ${formatUsd(output)}`}
        >
          <div className="bg-primary" style={{ width: `${inputShare}%` }} />
          <div className="bg-primary/35" style={{ width: `${100 - inputShare}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-[13px] text-muted-foreground">
          <span>Input share</span>
          <span>Output share</span>
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground">
        <ProviderIcon provider={estimate.model.provider} className="mr-2 size-5 align-middle" />
        {estimate.model.display_name}
        <span className="ml-2 font-mono">{estimate.tokenizer_used}</span>
        {!estimate.is_tokenizer_exact ? " · approximate tokenizer" : ""}
      </p>
      {estimate.warnings.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {estimate.warnings.map((warning) => (
            <li key={warning} className="rounded-xl bg-warning/15 px-3 py-2 text-[13px] text-warning">
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="tabular font-mono text-[15px]">{value}</dd>
    </div>
  );
}
