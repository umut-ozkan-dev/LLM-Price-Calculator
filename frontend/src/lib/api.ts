import type { CatalogResponse, CompareResponse, EstimateResponse, RunResponse } from "./types";
import { estimateRequestSchema, runRequestSchema, type EstimateRequestInput, type RunRequestInput } from "./schemas";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8010";

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string") return payload.detail;
  } catch {
    // The body was not JSON.
  }
  return `Request failed (${response.status}).`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as T;
}

export function fetchCatalog(): Promise<CatalogResponse> {
  return request<CatalogResponse>("/api/models");
}

export function estimateCost(input: EstimateRequestInput): Promise<EstimateResponse> {
  const body = estimateRequestSchema.parse(input);
  return request<EstimateResponse>("/api/estimate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function compareCosts(
  input: Omit<EstimateRequestInput, "model_id"> & { model_ids?: string[] | null },
): Promise<CompareResponse> {
  return request<CompareResponse>("/api/estimate/compare", {
    method: "POST",
    body: JSON.stringify({
      prompt: input.prompt,
      system_prompt: input.system_prompt,
      expected_output_tokens: input.expected_output_tokens,
      model_ids: input.model_ids ?? null,
    }),
  });
}

export function runPrompt(input: RunRequestInput): Promise<RunResponse> {
  const body = runRequestSchema.parse(input);
  return request<RunResponse>("/api/run", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
