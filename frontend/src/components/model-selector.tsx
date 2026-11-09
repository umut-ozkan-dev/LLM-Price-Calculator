"use client";

import { ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";

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

type ModelSelectorProps = {
  models: ModelSpec[];
  value: string;
  onChange: (id: string) => void;
  isLoading: boolean;
};

export function ModelSelector({ models, value, onChange, isLoading }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = models.find((model) => model.id === value);

  const groups = useMemo(() => {
    const grouped = new Map<ProviderName, ModelSpec[]>();
    for (const provider of PROVIDER_ORDER) grouped.set(provider, []);
    for (const model of models) grouped.get(model.provider)?.push(model);
    return PROVIDER_ORDER.map((provider) => ({
      provider,
      models: grouped.get(provider) ?? [],
    })).filter((group) => group.models.length > 0);
  }, [models]);

  if (isLoading) return <Skeleton className="h-16 w-full rounded-xl" />;

  return (
    <div className="flex flex-col gap-2">
      <span id="model-label" className="text-sm font-medium">
        Model
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="h-auto w-full justify-between px-3 py-2.5 text-left"
              aria-label={selected ? `Model, ${selected.display_name}` : "Choose a model"}
            />
          }
        >
          {selected ? <ModelSummary model={selected} /> : <span>Choose a model</span>}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(32rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder="Search models or providers" />
            <CommandList>
              <CommandEmpty>No model matches that search.</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group.provider} heading={PROVIDERS[group.provider].label}>
                  {group.models.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={`${model.display_name} ${model.id} ${model.provider}`}
                      onSelect={() => {
                        onChange(model.id);
                        setOpen(false);
                      }}
                    >
                      <span className={`size-2 shrink-0 rounded-full ${PROVIDERS[model.provider].dot}`} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{model.display_name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {formatPerMillion(model.input_price_per_1m_tokens)} in ·{" "}
                          {formatPerMillion(model.output_price_per_1m_tokens)} out ·{" "}
                          {formatTokens(model.context_window)} ctx
                        </span>
                      </span>
                    </CommandItem>
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
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex items-center gap-2">
        <span className={`size-2 rounded-full ${PROVIDERS[model.provider].dot}`} aria-hidden />
        <span className="truncate text-sm">{model.display_name}</span>
        <span className="text-xs text-muted-foreground">{PROVIDERS[model.provider].label}</span>
      </span>
      <span className="font-mono text-[11px] text-muted-foreground">
        {formatPerMillion(model.input_price_per_1m_tokens)} / {formatPerMillion(model.output_price_per_1m_tokens)} per 1M
        · {formatTokens(model.context_window)} context
      </span>
    </span>
  );
}
