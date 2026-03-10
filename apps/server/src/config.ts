import "dotenv/config";

export const config = {
  spritesheet: {
    qa: {
      llmEnabled: process.env.SPRITESHEET_QA_LLM_ENABLED === "true",
      algorithmicEnabled: process.env.SPRITESHEET_QA_ALGORITHMIC_ENABLED === "true",
      maxRetries: parseInt(process.env.SPRITESHEET_QA_MAX_RETRIES || "3", 10),
      /** When set, each QA attempt image is written here as attempt-1.png, attempt-2.png, and feedback is appended to qa-log.txt */
      debugOutputDir: process.env.SPRITESHEET_QA_DEBUG_OUTPUT_DIR || null,
    },
  },
  elevenlabs: {
    /** API key for Eleven Labs (elevenlabs.io). Required for sound-effect generation and POST /api/sound-effect. */
    apiKey: process.env.ELEVENLABS_API_KEY ?? null,
    /** When set, generated sound effects are also written here with sequential ids (0001-slug.mp3, 0002-slug.mp3, …). */
    debugOutputDir: process.env.SOUND_EFFECT_DEBUG_OUTPUT_DIR || null,
  },
  kling: {
    /** API key for Kling 3.0 (get from kling3api.com). Required for Kling video endpoints and CLI. */
    apiKey: process.env.KLING_API_KEY ?? null,
    /** Kling 3.0 API base URL (3-15s, pro/std, native audio). */
    baseUrl: process.env.KLING_BASE_URL ?? "https://kling3api.com",
    /** Poll timeout in ms when waiting for video result (default: 10 min). */
    pollTimeoutMs: parseInt(process.env.KLING_POLL_TIMEOUT_MS || "600000", 10),
    /** Poll interval in ms between status checks (default: 15 s). */
    pollIntervalMs: parseInt(process.env.KLING_POLL_INTERVAL_MS || "15000", 10),
  },
};
