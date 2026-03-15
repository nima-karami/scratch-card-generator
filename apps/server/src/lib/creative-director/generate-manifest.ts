import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { config } from "../../config.js";
import { PIPELINE_CONFIG } from "./pipeline-config.js";
import { THEME_MANIFEST_RESPONSE_SCHEMA, themeManifestSchema, type ThemeManifest } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CREATIVE_DIRECTOR_MODEL = "gemini-3.1-pro-preview";
const MAX_RETRIES = 3;

let cachedSystemPrompt: string | null = null;

async function loadSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) return cachedSystemPrompt;
  const path = join(__dirname, "system-prompt.md");
  const raw = await readFile(path, "utf-8");
  cachedSystemPrompt = raw
    .replace(/\{\{SPRITESHEET_VARIANT_COUNT\}\}/g, String(PIPELINE_CONFIG.spritesheet.variantCount));
  return cachedSystemPrompt;
}

/**
 * Calls the Creative Director LLM with the theme description, parses and validates
 * the response as ThemeManifest. Retries up to MAX_RETRIES on validation failure.
 */
export async function generateManifest(themeDescription: string): Promise<ThemeManifest> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for Creative Director. Set it in .env.");
  }

  const systemPrompt = await loadSystemPrompt();
  const userMessage = `Theme from the user: ${themeDescription}\n\nOutput the complete JSON manifest now. Remember: themeDescription in meta should be exactly this theme input.`;

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: CREATIVE_DIRECTOR_MODEL,
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: THEME_MANIFEST_RESPONSE_SCHEMA,
        },
      });

      const text = response.text?.trim();
      if (!text) {
        lastError = new Error("Empty response from Creative Director");
        continue;
      }

      const raw = JSON.parse(text) as unknown;
      const parsed = themeManifestSchema.safeParse(raw);

      if (parsed.success) {
        parsed.data.meta.generatedAt = new Date().toISOString();
        return parsed.data;
      }

      lastError = parsed.error;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Creative Director failed after ${MAX_RETRIES} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
