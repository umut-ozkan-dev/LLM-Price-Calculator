import type { ProviderName } from "./types";

export const PROVIDERS: Record<ProviderName, { label: string; dot: string }> = {
  openai: { label: "OpenAI", dot: "bg-emerald-500" },
  anthropic: { label: "Anthropic", dot: "bg-amber-500" },
  google: { label: "Google", dot: "bg-blue-500" },
  mistral: { label: "Mistral", dot: "bg-orange-500" },
  deepseek: { label: "DeepSeek", dot: "bg-indigo-400" },
  groq: { label: "Groq", dot: "bg-rose-500" },
};

export const PROVIDER_ORDER: ProviderName[] = [
  "openai",
  "anthropic",
  "google",
  "mistral",
  "deepseek",
  "groq",
];
