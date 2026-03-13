import "dotenv/config";
import { DEFAULT_MAX_GENERATIONS_PER_USER } from "@repo/shared";

export const config = {
  /** Server and rate limit. */
  server: {
    port: Number(process.env.PORT) || 3001,
    maxGenerationsPerUser: Number(process.env.MAX_GENERATIONS_PER_USER) || DEFAULT_MAX_GENERATIONS_PER_USER,
  },
  /** Redis for BullMQ. */
  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },
  /** Queue worker. */
  queue: {
    concurrency: Math.min(Number(process.env.MAX_CONCURRENT_JOBS) || 10, 20),
  },

  /** API keys and service options only. No debug paths here. */
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? null,
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY ?? null,
  },
  kling: {
    apiKey: process.env.KLING_API_KEY ?? null,
    baseUrl: process.env.KLING_BASE_URL ?? "https://kling3api.com",
    pollTimeoutMs: parseInt(process.env.KLING_POLL_TIMEOUT_MS || "600000", 10),
    pollIntervalMs: parseInt(process.env.KLING_POLL_INTERVAL_MS || "15000", 10),
  },

  /** Feature options (no API keys, no debug paths). */
  spritesheet: {
    qa: {
      llmEnabled: process.env.SPRITESHEET_QA_LLM_ENABLED === "true",
      algorithmicEnabled: process.env.SPRITESHEET_QA_ALGORITHMIC_ENABLED === "true",
      maxRetries: parseInt(process.env.SPRITESHEET_QA_MAX_RETRIES || "3", 10),
    },
  },

  /** When set, generated assets are written under these dirs (one key per feature). Null = no debug output. */
  debug: {
    soundEffect: process.env.SOUND_EFFECT_DEBUG_OUTPUT_DIR || null,
    titleImage: process.env.TITLE_IMAGE_DEBUG_OUTPUT_DIR || null,
    videoBackground: process.env.VIDEO_BACKGROUND_DEBUG_OUTPUT_DIR || null,
    containerImage: process.env.CONTAINER_IMAGE_DEBUG_OUTPUT_DIR || null,
    spritesheetQa: process.env.SPRITESHEET_QA_DEBUG_OUTPUT_DIR || null,
    glyphSheet: process.env.GLYPH_SHEET_DEBUG_OUTPUT_DIR || null,
  },
};
