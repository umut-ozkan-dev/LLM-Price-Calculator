"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatTokens } from "@/lib/format";

type OutputLengthProps = {
  auto: boolean;
  onAutoChange: (auto: boolean) => void;
  value: number;
  onValueChange: (value: number) => void;
  max: number;
};

export function OutputLength({ auto, onAutoChange, value, onValueChange, max }: OutputLengthProps) {
  const sliderMax = Math.max(50, Math.min(max, 16_000));
  const clamped = Math.min(Math.max(value, 0), max);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium">Expected output</legend>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="auto-output" className="text-sm font-normal text-muted-foreground">
          Auto (estimate range)
        </Label>
        <Switch id="auto-output" checked={auto} onCheckedChange={onAutoChange} />
      </div>
      <div className={auto ? "pointer-events-none opacity-40" : ""}>
        <div className="flex items-center gap-3">
          <Slider
            aria-label="Expected output tokens"
            min={0}
            max={sliderMax}
            step={10}
            disabled={auto}
            value={[Math.min(clamped, sliderMax)]}
            onValueChange={(next) => {
              const resolved = Array.isArray(next) ? next[0] : next;
              onValueChange(resolved ?? 0);
            }}
          />
          <Input
            aria-label="Expected output tokens"
            type="number"
            min={0}
            max={max}
            disabled={auto}
            value={clamped}
            onChange={(event) => onValueChange(Number(event.target.value))}
            className="w-28 font-mono"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {auto
            ? "Low, expected, and high output lengths are derived from the input size."
            : `${formatTokens(clamped)} tokens. Model max is ${formatTokens(max)}.`}
        </p>
      </div>
    </fieldset>
  );
}
