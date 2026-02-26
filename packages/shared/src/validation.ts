import { z } from "zod";
import { MAX_PROMPT_LENGTH } from "./constants.js";

/** Schema for theme prompt: non-empty, trimmed, max length */
export const promptSchema = z
  .string()
  .trim()
  .min(1, "Prompt is required")
  .max(MAX_PROMPT_LENGTH, `Prompt must be at most ${MAX_PROMPT_LENGTH} characters`);

/** Schema for POST /api/generate body */
export const generateRequestSchema = z.object({
  prompt: promptSchema,
});

export type GenerateRequestInput = z.infer<typeof generateRequestSchema>;
