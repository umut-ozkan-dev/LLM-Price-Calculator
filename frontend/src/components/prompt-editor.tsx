"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatTokens } from "@/lib/format";

export const SAMPLE_PROMPT =
  "Write a launch email for a notes app. Mention offline sync, a 14-day trial, and keep it under 120 words.";

type PromptEditorProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
  charCount: number;
  tokenCount: number;
  tokenApprox: boolean;
};

export function PromptEditor({
  prompt,
  onPromptChange,
  systemPrompt,
  onSystemPromptChange,
  charCount,
  tokenCount,
  tokenApprox,
}: PromptEditorProps) {
  const [systemOpen, setSystemOpen] = useState(false);

  return (
    <section className="surface-card flex flex-col gap-4 p-5" aria-labelledby="prompt-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="prompt-heading" className="text-[15px] font-semibold">
          Prompt
        </h2>
        <p className="tabular flex items-center gap-2 text-[13px] text-muted-foreground" aria-live="polite">
          <span className="font-mono">
            {formatTokens(charCount)} chars · {formatTokens(tokenCount)} tokens
          </span>
          <Badge variant="outline" className={tokenApprox ? "" : "border-primary/40 text-primary"}>
            {tokenApprox ? "approx" : "exact"}
          </Badge>
        </p>
      </div>
      <Label htmlFor="prompt" className="sr-only">
        Prompt
      </Label>
      <Textarea
        id="prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Explain, in plain language, what changes when a prompt crosses a model's long-context price tier."
        className="min-h-[280px] resize-y rounded-xl border-input bg-background/60 p-5 text-[15px] leading-relaxed shadow-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg text-[15px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={systemOpen}
          aria-controls="system-prompt-panel"
          onClick={() => setSystemOpen((open) => !open)}
        >
          <ChevronDown className={`size-4 transition-transform duration-200 ${systemOpen ? "rotate-180" : ""}`} />
          System prompt
          {systemPrompt.trim() ? (
            <span className="font-mono text-[13px]">{formatTokens(systemPrompt.length)} chars</span>
          ) : (
            <span className="text-[13px]">optional</span>
          )}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-primary hover:bg-primary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onPromptChange(SAMPLE_PROMPT)}
        >
          <Sparkles className="size-3.5" />
          Try an example
        </button>
      </div>
      {systemOpen ? (
        <div id="system-prompt-panel">
          <Label htmlFor="system-prompt" className="sr-only">
            System prompt
          </Label>
          <Textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(event) => onSystemPromptChange(event.target.value)}
            placeholder="You are a careful editor. Prefer short sentences."
            className="min-h-28 rounded-xl p-4 text-[15px] leading-relaxed"
          />
        </div>
      ) : null}
    </section>
  );
}
