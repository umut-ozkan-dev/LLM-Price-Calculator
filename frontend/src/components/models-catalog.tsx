"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ProviderIcon } from "@/components/provider-icon";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fetchCatalog } from "@/lib/api";
import { formatPerMillion, formatTokens } from "@/lib/format";
import { PROVIDERS, PROVIDER_ORDER } from "@/lib/providers";
import type { ModelSpec, ProviderName } from "@/lib/types";

type SortKey = "name" | "input" | "output";

function isDeprecated(model: ModelSpec) {
  return (model.notes ?? "").toLowerCase().includes("deprecated");
}

export function ModelsCatalog() {
  const catalog = useQuery({ queryKey: ["models"], queryFn: fetchCatalog });
  const [query, setQuery] = useState("");
  const [providers, setProviders] = useState<ProviderName[]>([]);
  const [sort, setSort] = useState<SortKey>("name");
  const [showDeprecated, setShowDeprecated] = useState(true);
  const [grouped, setGrouped] = useState(true);
  const [openNotes, setOpenNotes] = useState<string | null>(null);

  const models = useMemo(() => catalog.data?.models ?? [], [catalog.data]);
  const maxInput = Math.max(...models.map((model) => model.input_price_per_1m_tokens), 1);
  const maxOutput = Math.max(...models.map((model) => model.output_price_per_1m_tokens), 1);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = models.filter((model) => {
      if (!showDeprecated && isDeprecated(model)) return false;
      if (providers.length > 0 && !providers.includes(model.provider)) return false;
      if (!needle) return true;
      return (
        model.display_name.toLowerCase().includes(needle) ||
        model.id.toLowerCase().includes(needle) ||
        model.provider.includes(needle)
      );
    });
    filtered.sort((a, b) => {
      if (sort === "input") return a.input_price_per_1m_tokens - b.input_price_per_1m_tokens;
      if (sort === "output") return a.output_price_per_1m_tokens - b.output_price_per_1m_tokens;
      return a.display_name.localeCompare(b.display_name);
    });
    return filtered;
  }, [models, query, providers, showDeprecated, sort]);

  const groups = PROVIDER_ORDER.map((provider) => ({
    provider,
    models: rows.filter((model) => model.provider === provider),
  })).filter((group) => group.models.length > 0);

  function toggleProvider(provider: ProviderName) {
    setProviders((current) =>
      current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider],
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-4xl font-semibold sm:text-5xl">Pricing catalog</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Public list prices recorded on {catalog.data?.version ?? "…"}. Cached input is the cache-hit rate.
          Bars show price relative to the most expensive model in the catalog.
        </p>
      </div>

      <div className="surface-card flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search models"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or model id"
              className="h-11 pl-9 text-[15px]"
            />
          </div>
          <label className="flex items-center gap-2 text-[15px]">
            Sort
            <select
              aria-label="Sort models"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-11 rounded-xl border border-input bg-background px-3"
            >
              <option value="name">Name</option>
              <option value="input">Input price</option>
              <option value="output">Output price</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by provider">
          {PROVIDER_ORDER.map((provider) => {
            const active = providers.includes(provider);
            return (
              <button
                key={provider}
                type="button"
                aria-pressed={active}
                onClick={() => toggleProvider(provider)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "border-primary bg-primary-subtle text-foreground" : "border-border text-muted-foreground"
                }`}
              >
                <ProviderIcon provider={provider} className="size-5" />
                {PROVIDERS[provider].label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-6 text-[15px]">
          <label className="flex items-center gap-2">
            <Switch checked={showDeprecated} onCheckedChange={setShowDeprecated} aria-label="Show deprecated models" />
            Show deprecated
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={grouped} onCheckedChange={setGrouped} aria-label="Group by provider" />
            Group by provider
          </label>
        </div>
      </div>

      {catalog.isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <span className="sr-only">Loading catalog</span>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}
      {catalog.isError ? (
        <div className="flex items-center gap-3" role="alert">
          <p className="text-[15px] text-destructive">Could not load models.</p>
          <button type="button" className="font-medium text-primary" onClick={() => catalog.refetch()}>
            Retry
          </button>
        </div>
      ) : null}
      {!catalog.isLoading && rows.length === 0 ? (
        <p className="text-[15px] text-muted-foreground">No models match that filter.</p>
      ) : null}

      <div className="flex flex-col gap-3 lg:hidden">
        {rows.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            maxInput={maxInput}
            maxOutput={maxOutput}
            open={openNotes === model.id}
            onToggle={() => setOpenNotes((current) => (current === model.id ? null : model.id))}
          />
        ))}
      </div>

      {rows.length > 0 ? (
        <div className="surface-card hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[860px] text-[15px]">
            <caption className="sr-only">Model list prices per million tokens</caption>
            <thead className="sticky top-16 z-10 bg-card text-left text-[13px] text-muted-foreground">
              <tr className="border-b border-border">
                {["Model", "Input / 1M", "Output / 1M", "Cached input", "Context", "Updated", "Source"].map((label) => (
                  <th key={label} className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(grouped ? groups : [{ provider: null, models: rows }]).map((group) => (
                <GroupRows
                  key={group.provider ?? "flat"}
                  provider={group.provider}
                  models={group.models}
                  maxInput={maxInput}
                  maxOutput={maxOutput}
                  openNotes={openNotes}
                  onToggle={(id) => setOpenNotes((current) => (current === id ? null : id))}
                  grouped={grouped}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function GroupRows({
  provider,
  models,
  maxInput,
  maxOutput,
  openNotes,
  onToggle,
  grouped,
}: {
  provider: ProviderName | null;
  models: ModelSpec[];
  maxInput: number;
  maxOutput: number;
  openNotes: string | null;
  onToggle: (id: string) => void;
  grouped: boolean;
}) {
  return (
    <>
      {grouped && provider ? (
        <tr className="sticky top-28 bg-secondary/90">
          <td colSpan={7} className="px-4 py-2">
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
              <ProviderIcon provider={provider} className="size-5" />
              {PROVIDERS[provider].label}
              <span className="font-normal text-muted-foreground">{models.length}</span>
            </span>
          </td>
        </tr>
      ) : null}
      {models.map((model) => (
        <ModelRow
          key={model.id}
          model={model}
          maxInput={maxInput}
          maxOutput={maxOutput}
          open={openNotes === model.id}
          onToggle={() => onToggle(model.id)}
        />
      ))}
    </>
  );
}

function ModelRow({
  model,
  maxInput,
  maxOutput,
  open,
  onToggle,
}: {
  model: ModelSpec;
  maxInput: number;
  maxOutput: number;
  open: boolean;
  onToggle: () => void;
}) {
  const deprecated = isDeprecated(model);
  return (
    <>
      <tr className={`border-b border-border/70 hover:bg-foreground/5 ${deprecated ? "opacity-60" : ""}`}>
        <td className="px-4 py-3">
          <span className="flex items-center gap-3">
            <ProviderIcon provider={model.provider} />
            <span>
              <span className="flex items-center gap-2 font-medium">
                {model.display_name}
                {deprecated ? <Badge variant="outline">Deprecated</Badge> : null}
              </span>
              <span className="font-mono text-[12px] text-muted-foreground">{model.id}</span>
            </span>
          </span>
        </td>
        <PriceCell value={model.input_price_per_1m_tokens} max={maxInput} />
        <PriceCell value={model.output_price_per_1m_tokens} max={maxOutput} />
        <td className="tabular px-4 py-3 font-mono">
          {model.cached_input_price_per_1m_tokens == null ? "—" : formatPerMillion(model.cached_input_price_per_1m_tokens)}
        </td>
        <td className="tabular px-4 py-3 font-mono">{formatTokens(model.context_window)}</td>
        <td className="px-4 py-3 font-mono text-[13px]">{model.last_updated}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <a href={model.source_url} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
              Source
            </a>
            {model.notes ? (
              <button type="button" className="text-[13px] text-muted-foreground underline-offset-4 hover:underline" aria-expanded={open} onClick={onToggle}>
                Notes
              </button>
            ) : null}
          </div>
        </td>
      </tr>
      {open && model.notes ? (
        <tr>
          <td colSpan={7} className="bg-secondary/60 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
            {model.notes}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function PriceCell({ value, max }: { value: number; max: number }) {
  return (
    <td className="px-4 py-3">
      <div className="tabular font-mono">{formatPerMillion(value)}</div>
      <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(6, (value / max) * 100)}%` }} />
      </div>
    </td>
  );
}

function ModelCard({
  model,
  maxInput,
  maxOutput,
  open,
  onToggle,
}: {
  model: ModelSpec;
  maxInput: number;
  maxOutput: number;
  open: boolean;
  onToggle: () => void;
}) {
  const deprecated = isDeprecated(model);
  return (
    <article className={`surface-card p-4 ${deprecated ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3">
        <ProviderIcon provider={model.provider} />
        <div>
          <p className="font-medium">
            {model.display_name} {deprecated ? <Badge variant="outline">Deprecated</Badge> : null}
          </p>
          <p className="font-mono text-[12px] text-muted-foreground">{model.id}</p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
        <div>
          <dt className="text-muted-foreground">Input</dt>
          <dd className="tabular font-mono">{formatPerMillion(model.input_price_per_1m_tokens)}</dd>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full bg-primary" style={{ width: `${(model.input_price_per_1m_tokens / maxInput) * 100}%` }} />
          </div>
        </div>
        <div>
          <dt className="text-muted-foreground">Output</dt>
          <dd className="tabular font-mono">{formatPerMillion(model.output_price_per_1m_tokens)}</dd>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full bg-primary" style={{ width: `${(model.output_price_per_1m_tokens / maxOutput) * 100}%` }} />
          </div>
        </div>
      </dl>
      <div className="mt-3 flex items-center justify-between text-[13px]">
        <a href={model.source_url} className="text-primary" target="_blank" rel="noreferrer">
          Source
        </a>
        <span className="font-mono">{model.last_updated}</span>
      </div>
      {model.notes ? (
        <button type="button" className="mt-2 text-[13px] text-muted-foreground" aria-expanded={open} onClick={onToggle}>
          {open ? "Hide notes" : "Notes"}
        </button>
      ) : null}
      {open && model.notes ? <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{model.notes}</p> : null}
    </article>
  );
}
