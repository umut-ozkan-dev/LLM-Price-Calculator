"use client";

import { ChevronsUpDown } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import { ProviderIcon } from "@/components/provider-icon";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPerMillion, formatTokens } from "@/lib/format";
import { PROVIDERS, PROVIDER_ORDER } from "@/lib/providers";
import type { ModelSpec, ProviderName } from "@/lib/types";

const RECENT_KEY = "llm-price-recent-models";
const RECENT_EVENT = "llm-price-recent";

function readRecent(): string {
  return localStorage.getItem(RECENT_KEY) ?? "[]";
}

function rememberModel(id: string) {
  const current = JSON.parse(readRecent()) as string[];
  const next = [id, ...current.filter((item) => item !== id)].slice(0, 3);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(RECENT_EVENT));
}

function useRecentIds() {
  const raw = useSyncExternalStore(
    (onChange) => {
      window.addEventListener(RECENT_EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(RECENT_EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    readRecent,
    () => "[]",
  );
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

type ModelSelectorProps = {
  models: ModelSpec[];
  value: string;
  onChange: (id: string) => void;
  isLoading: boolean;
};

export function ModelSelector({ models, value, onChange, isLoading }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const recentIds = useRecentIds();
  const selected = models.find((model) => model.id === value);
  const byId = useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);

  const groups = useMemo(() => {
    const grouped = new Map<ProviderName, ModelSpec[]>();
    for (const provider of PROVIDER_ORDER) grouped.set(provider, []);
    for (const model of models) grouped.get(model.provider)?.push(model);
    return PROVIDER_ORDER.map((provider) => ({
      provider,
      models: grouped.get(provider) ?? [],
    })).filter((group) => group.models.length > 0);
  }, [models]);

  const recent = recentIds.map((id) => byId.get(id)).filter((model): model is ModelSpec => Boolean(model));

  if (isLoading) return <Skeleton className="h-20 w-full rounded-2xl" />;

  function choose(id: string) {
    rememberModel(id);
    onChange(id);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted-foreground">Model</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="surface-card h-auto w-full justify-between rounded-2xl px-4 py-3.5 text-left shadow-none"
              aria-label={selected ? `Model, ${selected.display_name}` : "Choose a model"}
            />
          }
        >
          {selected ? <ModelSummary model={selected} /> : <span className="text-[15px]">Choose a model</span>}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(36rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder="Search models or providers" />
            <CommandList>
              <CommandEmpty>No model matches that search.</CommandEmpty>
              {recent.length > 0 ? (
                <CommandGroup heading="Recently used">
                  {recent.map((model) => (
                    <ModelOption key={`recent-${model.id}`} model={model} onSelect={() => choose(model.id)} />
                  ))}
                </CommandGroup>
              ) : null}
              {groups.map((group) => (
                <CommandGroup key={group.provider} heading={PROVIDERS[group.provider].label}>
                  {group.models.map((model) => (
                    <ModelOption key={model.id} model={model} onSelect={() => choose(model.id)} />
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function ModelSummary({ model }: { model: ModelSpec }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <ProviderIcon provider={model.provider} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">
          {model.display_name}
          <span className="ml-2 font-normal text-muted-foreground">{PROVIDERS[model.provider].label}</span>
        </span>
        <span className="tabular truncate font-mono text-[13px] text-muted-foreground">
          {formatPerMillion(model.input_price_per_1m_tokens)} in · {formatPerMillion(model.output_price_per_1m_tokens)} out
          per 1M · {formatTokens(model.context_window)} ctx
        </span>
      </span>
    </span>
  );
}

function ModelOption({ model, onSelect }: { model: ModelSpec; onSelect: () => void }) {
  return (
    <CommandItem
      value={`${model.display_name} ${model.id} ${model.provider}`}
      onSelect={onSelect}
      className="py-2"
    >
      <ProviderIcon provider={model.provider} className="size-6" />
      <span className="min-w-0 flex-1 truncate text-[15px]">{model.display_name}</span>
      <span className="tabular font-mono text-[12px] text-muted-foreground">
        {formatPerMillion(model.input_price_per_1m_tokens)} / {formatPerMillion(model.output_price_per_1m_tokens)}
      </span>
    </CommandItem>
  );
}
