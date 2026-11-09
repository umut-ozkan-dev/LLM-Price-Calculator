"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
    <section className="flex flex-col gap-3" aria-labelledby="prompt-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="prompt-heading" className="text-sm font-medium">
            Prompt
          </h2>
          <p className="text-xs text-muted-foreground">Paste the user message you plan to send.</p>
        </div>
        <p className="font-mono text-xs text-muted-foreground" aria-live="polite">
          {charCount.toLocaleString()} chars · {tokenCount.toLocaleString()} tokens
          {tokenApprox ? (
            <Badge variant="outline" className="ml-2 align-middle">
              approx
            </Badge>
          ) : null}
        </p>
      </div>
      <Label htmlFor="prompt" className="sr-only">
        Prompt
      </Label>
      <Textarea
        id="prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Explain the tradeoff between prompt caching and a shorter system prompt…"
        className="min-h-52 resize-y font-mono text-[13px] leading-relaxed"
      />
      <button
        type="button"
        className="flex w-fit items-center gap-1 rounded-md text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-expanded={systemOpen}
        aria-controls="system-prompt-panel"
        onClick={() => setSystemOpen((open) => !open)}
      >
        <ChevronDown className={`size-3.5 transition-transform ${systemOpen ? "rotate-180" : ""}`} />
        System prompt
        <span className="text-muted-foreground/80">optional</span>
      </button>
      {systemOpen ? (
        <div id="system-prompt-panel">
          <Label htmlFor="system-prompt" className="sr-only">
            System prompt
          </Label>
          <Textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(event) => onSystemPromptChange(event.target.value)}
            placeholder="You are a careful assistant."
            className="min-h-24 font-mono text-[13px]"
          />
        </div>
      ) : null}
    </section>
  );
}
