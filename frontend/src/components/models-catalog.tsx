"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchCatalog } from "@/lib/api";
import { formatPerMillion, formatTokens } from "@/lib/format";
import { PROVIDERS, PROVIDER_ORDER } from "@/lib/providers";
import type { ProviderName } from "@/lib/types";

export function ModelsCatalog() {
  const catalog = useQuery({ queryKey: ["models"], queryFn: fetchCatalog });
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<ProviderName | "all">("all");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (catalog.data?.models ?? []).filter((model) => {
      if (provider !== "all" && model.provider !== provider) return false;
      if (!needle) return true;
      return (
        model.display_name.toLowerCase().includes(needle) ||
        model.id.toLowerCase().includes(needle) ||
        model.provider.includes(needle)
      );
    });
  }, [catalog.data, query, provider]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pricing catalog</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Public list prices recorded on {catalog.data?.version ?? "…"}. Cached-input rates are cache
          hits, not cache writes. Long-context tiers are noted on each row.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="model-search">Search</Label>
          <Input
            id="model-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or model id"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="provider-filter">Provider</Label>
          <select
            id="provider-filter"
            value={provider}
            onChange={(event) => setProvider(event.target.value as ProviderName | "all")}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="all">All providers</option>
            {PROVIDER_ORDER.map((item) => (
              <option key={item} value={item}>
                {PROVIDERS[item].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {catalog.isLoading ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <span className="sr-only">Loading catalog</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}
      {catalog.isError ? (
        <p className="text-sm text-destructive" role="alert">
          {catalog.error instanceof Error ? catalog.error.message : "Could not load models."}
        </p>
      ) : null}
      {!catalog.isLoading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No models match that filter.</p>
      ) : null}
      {rows.length > 0 ? (
        <Table>
          <caption className="sr-only">Model list prices per million tokens</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Input / 1M</TableHead>
              <TableHead>Output / 1M</TableHead>
              <TableHead>Cached input</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((model) => (
              <TableRow key={model.id}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${PROVIDERS[model.provider].dot}`} aria-hidden />
                    <span>
                      <span className="block">{model.display_name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{model.id}</span>
                    </span>
                  </span>
                  {model.notes ? (
                    <span className="mt-1 block max-w-sm text-xs text-muted-foreground">{model.notes}</span>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono">{formatPerMillion(model.input_price_per_1m_tokens)}</TableCell>
                <TableCell className="font-mono">{formatPerMillion(model.output_price_per_1m_tokens)}</TableCell>
                <TableCell className="font-mono">
                  {model.cached_input_price_per_1m_tokens == null
                    ? "—"
                    : formatPerMillion(model.cached_input_price_per_1m_tokens)}
                </TableCell>
                <TableCell className="font-mono">{formatTokens(model.context_window)}</TableCell>
                <TableCell className="font-mono text-xs">{model.last_updated}</TableCell>
                <TableCell>
                  <a
                    href={model.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Pricing source
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
