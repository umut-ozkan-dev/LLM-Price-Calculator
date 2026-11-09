"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { formatTokens } from "@/lib/format";
import { cn } from "@/lib/utils";

export type OutputMode = "auto" | "short" | "medium" | "long" | "custom";

export const OUTPUT_PRESETS: Record<Exclude<OutputMode, "auto" | "custom">, number> = {
  short: 128,
  medium: 512,
  long: 2048,
};

const MODES: { id: OutputMode; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "long", label: "Long" },
  { id: "custom", label: "Custom" },
];

type OutputLengthProps = {
  mode: OutputMode;
  onModeChange: (mode: OutputMode) => void;
  value: number;
  onValueChange: (value: number) => void;
  max: number;
};

export function OutputLength({ mode, onModeChange, value, onValueChange, max }: OutputLengthProps) {
  const sliderMax = Math.max(64, Math.min(max, 16_000));
  const clamped = Math.min(Math.max(value, 0), max);

  return (
    <fieldset className="surface-card flex flex-col gap-4 p-5">
      <legend className="text-[15px] font-semibold">Expected output</legend>
      <div className="grid grid-cols-5 gap-1 rounded-xl bg-secondary p-1" role="radiogroup" aria-label="Expected output length">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={mode === item.id}
            className={cn(
              "rounded-lg px-2 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-[15px]",
              mode === item.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onModeChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {mode === "custom" ? (
        <div className="flex items-center gap-4">
          <Slider
            aria-label="Expected output tokens"
            min={0}
            max={sliderMax}
            step={16}
            value={[Math.min(clamped, sliderMax)]}
            onValueChange={(next) => {
              const resolved = Array.isArray(next) ? next[0] : next;
              onValueChange(resolved ?? 0);
            }}
            className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-foreground/20"
          />
          <Input
            aria-label="Expected output tokens"
            type="number"
            min={0}
            max={max}
            value={clamped}
            onChange={(event) => onValueChange(Number(event.target.value))}
            className="tabular w-28 font-mono"
          />
        </div>
      ) : null}
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {mode === "auto"
          ? "Auto builds a low, expected, and high output from the size of your prompt."
          : mode === "custom"
            ? `${formatTokens(clamped)} tokens. This model allows up to ${formatTokens(max)}.`
            : `${MODES.find((item) => item.id === mode)?.label} uses ${formatTokens(Math.min(OUTPUT_PRESETS[mode], max))} output tokens.`}
      </p>
    </fieldset>
  );
}
