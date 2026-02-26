/** Max characters allowed for theme prompt */
export const MAX_PROMPT_LENGTH = 200;

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
