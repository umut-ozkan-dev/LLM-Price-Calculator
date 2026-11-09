import type { ProviderName } from "./types";

export const PROVIDERS: Record<ProviderName, { label: string; color: string }> = {
  openai: { label: "OpenAI", color: "#10a37f" },
  anthropic: { label: "Anthropic", color: "#d4a27f" },
  google: { label: "Google", color: "#4285f4" },
  mistral: { label: "Mistral", color: "#f54e00" },
  deepseek: { label: "DeepSeek", color: "#4d6bfe" },
  groq: { label: "Meta", color: "#0668E1" },
};

export const PROVIDER_ORDER: ProviderName[] = [
  "openai",
  "anthropic",
  "google",
  "mistral",
  "deepseek",
  "groq",
];
