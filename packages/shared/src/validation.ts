import { z } from "zod";
import {
  KLING_MODELS,
  KLING_PROMPT_MAX_LENGTH,
  MAX_PROMPT_LENGTH,
  SOUND_EFFECT_PROMPT_MAX_LENGTH,
} from "./constants.js";

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

/** URL or base64 data URL (e.g. data:image/png;base64,...) */
const frameSchema = z
  .string()
  .min(1)
  .refine(
    (val) => z.string().url().safeParse(val).success || val.startsWith("data:"),
    { message: "Must be a URL or base64 data URL" }
  );

/** Kling video prompt: non-empty, trimmed, max 2500 chars */
export const klingPromptSchema = z
  .string()
  .trim()
  .min(1, "Prompt is required")
  .max(KLING_PROMPT_MAX_LENGTH, `Prompt must be at most ${KLING_PROMPT_MAX_LENGTH} characters`);

/** Schema for POST /api/kling/video body */
export const klingVideoRequestSchema = z.object({
  prompt: klingPromptSchema,
  startFrame: frameSchema.optional(),
  endFrame: frameSchema.optional(),
  model: z.enum(KLING_MODELS).optional(),
  /** Duration in seconds (3-15). */
  duration: z.number().int().min(3).max(15).optional(),
  aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).optional(),
  mode: z.enum(["standard", "professional"]).optional(),
});

export type KlingVideoRequestInput = z.infer<typeof klingVideoRequestSchema>;

/** Sound effect prompt: non-empty, trimmed, max length */
export const soundEffectPromptSchema = z
  .string()
  .trim()
  .min(1, "Prompt is required")
  .max(
    SOUND_EFFECT_PROMPT_MAX_LENGTH,
    `Prompt must be at most ${SOUND_EFFECT_PROMPT_MAX_LENGTH} characters`
  );

/** Schema for POST /api/sound-effect body. Use type preset (sfx=1s, bgm=30s loop) or explicit durationSeconds/loop. */
export const soundEffectRequestSchema = z.object({
  prompt: soundEffectPromptSchema,
  /** Preset: "sfx" = 1s non-looping, "bgm" = 30s looping */
  type: z.enum(["sfx", "bgm"]).optional(),
  /** Duration in seconds (0.5-30). Ignored when type is set. */
  durationSeconds: z.number().min(0.5).max(30).optional(),
  /** Seamless loop (v2 model). Ignored when type is set. */
  loop: z.boolean().optional(),
});

export type SoundEffectRequestInput = z.infer<typeof soundEffectRequestSchema>;
