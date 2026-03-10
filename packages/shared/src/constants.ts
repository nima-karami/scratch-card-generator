/** Max characters allowed for theme prompt */
export const MAX_PROMPT_LENGTH = 200;

/** Max characters for Kling video prompt (per API docs) */
export const KLING_PROMPT_MAX_LENGTH = 2500;

/** Max characters for Eleven Labs sound effect prompt */
export const SOUND_EFFECT_PROMPT_MAX_LENGTH = 500;

/** Supported Kling video models (most powerful first) */
export const KLING_MODELS = [
  "kling-video-o1",
  "kling-v2.6-pro",
  "kling-v2.6-std",
  "kling-v2.5-turbo",
] as const;
export type KlingModel = (typeof KLING_MODELS)[number];

/** Max concurrent BullMQ jobs (configurable via env) */
export const DEFAULT_MAX_CONCURRENT_JOBS = 10;

/** Max generations per user (IP/session) */
export const DEFAULT_MAX_GENERATIONS_PER_USER = 2;

/** SSE event type names */
export const SSE_EVENTS = {
  TEXT_READY: "text-ready",
  IMAGE_PROGRESS: "image-progress",
  IMAGE_READY: "image-ready",
  COMPOSING: "composing",
  COMPLETE: "complete",
  ERROR: "error",
} as const;
