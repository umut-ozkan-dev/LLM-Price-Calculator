"use client";

import { useState } from "react";

import { ProviderIcon } from "@/components/provider-icon";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTokens, formatUsd, relativeCost } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EstimateResponse } from "@/lib/types";

type SortKey = "cost" | "name" | "delta";

type ComparisonTableProps = {
  rows: EstimateResponse[];
  selectedId: string;
  isLoading: boolean;
  isEmpty: boolean;
  onSelect: (modelId: string) => void;
};

export function ComparisonTable({ rows, selectedId, isLoading, isEmpty, onSelect }: ComparisonTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [ascending, setAscending] = useState(true);
  const selected = rows.find((row) => row.model.id === selectedId);
  const selectedCost = selected?.cost_usd.expected ?? 0;
  const maxCost = rows.reduce((max, row) => Math.max(max, row.cost_usd.expected), 0);
  const cheapest = rows.reduce<number | null>((min, row) => {
    if (min === null || row.cost_usd.expected < min) return row.cost_usd.expected;
    return min;
  }, null);

  const sorted = [...rows].sort((a, b) => {
    const direction = ascending ? 1 : -1;
    if (sortKey === "name") return a.model.display_name.localeCompare(b.model.display_name) * direction;
    if (sortKey === "delta") {
      return (ratio(a.cost_usd.expected, selectedCost) - ratio(b.cost_usd.expected, selectedCost)) * direction;
    }
    return (a.cost_usd.expected - b.cost_usd.expected) * direction;
  });

  function toggle(next: SortKey) {
    if (sortKey === next) {
      setAscending((current) => !current);
      return;
    }
    setSortKey(next);
    setAscending(true);
  }

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold">Compare models</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">Same prompt, every model, sorted by expected cost.</p>
      </div>
      {isEmpty ? (
        <div className="flex flex-col gap-2">
          <p className="text-[15px] text-muted-foreground">Paste a prompt to compare every model.</p>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-10 rounded-lg bg-foreground/5" />
          ))}
        </div>
      ) : null}
      {isLoading && rows.length === 0 && !isEmpty ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <span className="sr-only">Loading comparison</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}
      {rows.length > 0 && !isEmpty ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] caption-bottom text-[15px]">
            <caption className="sr-only">Estimated cost of this prompt for every catalog model</caption>
            <thead className="sticky top-16 z-10 bg-card">
              <tr className="border-b border-border text-left text-[13px] text-muted-foreground">
                <th className="py-3 pr-3 font-medium" aria-sort={ariaSort(sortKey === "name", ascending)}>
                  <SortButton label="Model" active={sortKey === "name"} ascending={ascending} onClick={() => toggle("name")} />
                </th>
                <th className="px-3 py-3 font-medium">Input tokens</th>
                <th className="px-3 py-3 font-medium">Output</th>
                <th className="px-3 py-3 font-medium" aria-sort={ariaSort(sortKey === "cost", ascending)}>
                  <SortButton label="Expected cost" active={sortKey === "cost"} ascending={ascending} onClick={() => toggle("cost")} />
                </th>
                <th className="py-3 pl-3 font-medium" aria-sort={ariaSort(sortKey === "delta", ascending)}>
                  <SortButton label="Vs selected" active={sortKey === "delta"} ascending={ascending} onClick={() => toggle("delta")} />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const isCheapest = cheapest !== null && row.cost_usd.expected === cheapest;
                const isSelected = row.model.id === selectedId;
                const width = maxCost > 0 ? (row.cost_usd.expected / maxCost) * 100 : 0;
                const delta = isSelected ? "selected" : relativeCost(row.cost_usd.expected, selectedCost);
                const cheaper = delta.includes("cheaper");
                return (
                  <tr key={row.model.id} className="rise-in border-b border-border/70 hover:bg-foreground/5">
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        className="flex items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onSelect(row.model.id)}
                      >
                        <ProviderIcon provider={row.model.provider} />
                        <span>
                          <span className="flex items-center gap-2 text-[15px] font-medium">
                            {row.model.display_name}
                            {isSelected ? <Badge variant="outline">Selected</Badge> : null}
                            {isCheapest ? <Badge>Cheapest</Badge> : null}
                          </span>
                          <span className="font-mono text-[12px] text-muted-foreground">{row.model.id}</span>
                        </span>
                      </button>
                    </td>
                    <td className="tabular px-3 py-3 font-mono">{formatTokens(row.input_tokens)}</td>
                    <td className="tabular px-3 py-3 font-mono text-[13px]">
                      {formatTokens(row.output_tokens.low)}–{formatTokens(row.output_tokens.high)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="tabular font-mono">{formatUsd(row.cost_usd.expected)}</div>
                      <div className="mt-1.5 h-1.5 w-36 overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className={cn("h-full rounded-full", isCheapest ? "bg-success" : isSelected ? "bg-primary" : "bg-foreground/35")}
                          style={{ width: `${Math.max(width, 4)}%` }}
                        />
                      </div>
                    </td>
                    <td className={cn("tabular py-3 pl-3 font-medium", cheaper ? "text-success" : delta.includes("more") ? "text-destructive" : "")}>
                      {delta}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function ratio(cost: number, selected: number) {
  if (selected === 0) return 0;
  return (cost - selected) / selected;
}

function ariaSort(active: boolean, ascending: boolean): "ascending" | "descending" | "none" {
  if (!active) return "none";
  return ascending ? "ascending" : "descending";
}

function SortButton({
  label,
  active,
  ascending,
  onClick,
}: {
  label: string;
  active: boolean;
  ascending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Sort by ${label}`}
      onClick={onClick}
    >
      {label}
      {active ? (ascending ? " ↑" : " ↓") : ""}
    </button>
  );
}
