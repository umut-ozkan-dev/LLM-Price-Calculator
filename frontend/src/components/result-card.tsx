import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTokens, formatUsd } from "@/lib/format";
import type { EstimateResponse } from "@/lib/types";

type ResultCardProps = {
  estimate: EstimateResponse | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  isEmpty: boolean;
};

export function ResultCard({ estimate, isLoading, isError, errorMessage, isEmpty }: ResultCardProps) {
  return (
    <Card className="lg:sticky lg:top-20" aria-live="polite">
      <CardHeader>
        <CardDescription>Expected cost</CardDescription>
        <CardTitle className="font-mono text-4xl font-medium tracking-tight">
          {isEmpty ? "$—" : isLoading && !estimate ? "…" : estimate ? formatUsd(estimate.cost_usd.expected) : "$—"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">Paste a prompt to see what it would cost.</p>
        ) : null}
        {isError ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage || "The estimate could not be calculated."}
          </p>
        ) : null}
        {isLoading && !estimate ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <span className="sr-only">Estimating</span>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : null}
        {estimate && !isEmpty ? <EstimateBody estimate={estimate} /> : null}
      </CardContent>
    </Card>
  );
}

function EstimateBody({ estimate }: { estimate: EstimateResponse }) {
  const input = estimate.breakdown.input_cost;
  const output = estimate.breakdown.output_cost_expected;
  const total = input + output;
  const inputShare = total > 0 ? (input / total) * 100 : 0;
  const outputShare = total > 0 ? 100 - inputShare : 0;

  return (
    <>
        <p className="font-mono text-sm text-muted-foreground">
          {`${formatUsd(estimate.cost_usd.low)} – ${formatUsd(estimate.cost_usd.high)}`}
        </p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Input tokens</dt>
          <dd className="font-mono">{formatTokens(estimate.input_tokens)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Output tokens</dt>
          <dd className="font-mono">
            {formatTokens(estimate.output_tokens.low)} / {formatTokens(estimate.output_tokens.expected)} /{" "}
            {formatTokens(estimate.output_tokens.high)}
          </dd>
        </div>
      </dl>
      <div>
        <div
          className="flex h-2.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`Input cost ${formatUsd(input)}, output cost ${formatUsd(output)}`}
        >
          <div className="bg-primary" style={{ width: `${inputShare}%` }} />
          <div className="bg-foreground/25" style={{ width: `${outputShare}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Input {formatUsd(input)}</span>
          <span>Output {formatUsd(output)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="font-mono">
          {estimate.tokenizer_used}
        </Badge>
        {!estimate.is_tokenizer_exact ? <Badge variant="outline">approximate tokenizer</Badge> : null}
      </div>
      {estimate.warnings.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-xs text-amber-600 dark:text-amber-300">
          {estimate.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
