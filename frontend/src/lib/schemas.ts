import { z } from "zod";

export const estimateRequestSchema = z.object({
  prompt: z.string(),
  model_id: z.string().min(1, "Choose a model."),
  expected_output_tokens: z.number().int().nonnegative().nullable(),
  system_prompt: z.string().nullable(),
});

export const runRequestSchema = z.object({
  prompt: z.string().trim().min(1, "Enter a prompt before running it."),
  model_id: z.string().min(1, "Choose a model."),
  system_prompt: z.string().nullable(),
  max_output_tokens: z.number().int().positive().nullable(),
  api_key: z.string().optional(),
});

export type EstimateRequestInput = z.infer<typeof estimateRequestSchema>;
export type RunRequestInput = z.infer<typeof runRequestSchema>;
