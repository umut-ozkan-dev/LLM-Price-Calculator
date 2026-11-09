import { getEncoding, type Tiktoken } from "js-tiktoken";

let encoding: Tiktoken | null = null;

export function approximateTokens(text: string): number {
  if (!text) return 0;
  try {
    encoding ??= getEncoding("o200k_base");
    return encoding.encode(text).length;
  } catch {
    return Math.ceil(text.length / 4);
  }
}
