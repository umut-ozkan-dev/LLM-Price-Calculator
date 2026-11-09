"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTokens, formatUsd, relativeCost } from "@/lib/format";
import { PROVIDERS } from "@/lib/providers";
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
  const cheapest = rows.reduce<number | null>((min, row) => {
    if (min === null || row.cost_usd.expected < min) return row.cost_usd.expected;
    return min;
  }, null);

  const selectedCost = selected?.cost_usd.expected ?? 0;
  const sorted = [...rows].sort((a, b) => {
    const direction = ascending ? 1 : -1;
    if (sortKey === "name") return a.model.display_name.localeCompare(b.model.display_name) * direction;
    if (sortKey === "delta") {
      return (relativeValue(a.cost_usd.expected, selectedCost) - relativeValue(b.cost_usd.expected, selectedCost)) * direction;
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
    <Card>
      <CardHeader>
        <CardTitle>Compare models</CardTitle>
        <CardDescription>Same prompt, sorted by expected cost. The cheapest row is highlighted.</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">The comparison appears after you enter a prompt.</p>
        ) : null}
        {isLoading && rows.length === 0 ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            <span className="sr-only">Loading comparison</span>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : null}
        {rows.length > 0 && !isEmpty ? (
          <Table>
            <caption className="sr-only">Estimated cost of this prompt for every catalog model</caption>
            <TableHeader>
              <TableRow>
                <TableHead aria-sort={sortKey === "name" ? (ascending ? "ascending" : "descending") : "none"}>
                  <SortButton label="Model" active={sortKey === "name"} ascending={ascending} onClick={() => toggle("name")} />
                </TableHead>
                <TableHead>Input</TableHead>
                <TableHead aria-sort={sortKey === "cost" ? (ascending ? "ascending" : "descending") : "none"}>
                  <SortButton label="Expected cost" active={sortKey === "cost"} ascending={ascending} onClick={() => toggle("cost")} />
                </TableHead>
                <TableHead aria-sort={sortKey === "delta" ? (ascending ? "ascending" : "descending") : "none"}>
                  <SortButton
                    label="Vs selected"
                    active={sortKey === "delta"}
                    ascending={ascending}
                    onClick={() => toggle("delta")}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => {
                const isCheapest = cheapest !== null && row.cost_usd.expected === cheapest;
                const isSelected = row.model.id === selectedId;
                return (
                  <TableRow key={row.model.id} className={isCheapest ? "bg-primary/10" : undefined} data-cheapest={isCheapest || undefined}>
                    <TableCell>
                      <button
                        type="button"
                        className="rounded-md text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        onClick={() => onSelect(row.model.id)}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${PROVIDERS[row.model.provider].dot}`} aria-hidden />
                          <span>{row.model.display_name}</span>
                          {isSelected ? <Badge variant="outline">Selected</Badge> : null}
                          {isCheapest ? <Badge>Cheapest</Badge> : null}
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{row.model.id}</span>
                      </button>
                    </TableCell>
                    <TableCell className="font-mono">{formatTokens(row.input_tokens)}</TableCell>
                    <TableCell className="font-mono">{formatUsd(row.cost_usd.expected)}</TableCell>
                    <TableCell>
                      {isSelected
                        ? "selected"
                        : relativeCost(row.cost_usd.expected, selected?.cost_usd.expected ?? row.cost_usd.expected)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}

function relativeValue(cost: number, selected: number): number {
  if (selected === 0) return 0;
  return (cost - selected) / selected;
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
      className="rounded-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`Sort by ${label}`}
      onClick={onClick}
    >
      {label}
      {active ? (ascending ? " ↑" : " ↓") : ""}
    </button>
  );
}
