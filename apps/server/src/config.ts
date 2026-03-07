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
};
