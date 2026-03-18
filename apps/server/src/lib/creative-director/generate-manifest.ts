import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { config } from "../../config/index.js";
import {
  DEFAULT_VARIANT_ID,
  getActiveGameIdsForVariant,
} from "../../config/games/active-games-by-variant.js";
import {
  THEME_MANIFEST_META_RESPONSE_SCHEMA,
  THEME_MANIFEST_ELEMENTS_RESPONSE_SCHEMA,
  themeManifestMetaSchema,
  themeManifestElementsSchema,
  type ThemeManifest,
  type ThemeManifestMeta,
  type ThemeManifestElements,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CREATIVE_DIRECTOR_MODEL = "gemini-3.1-pro-preview";
const MAX_RETRIES = 3;

let cachedSystemPromptMeta: string | null = null;
const cachedSystemPromptElementsByActiveGameIdsKey = new Map<string, string>();

const DEFAULT_ACTIVE_GAME_IDS = getActiveGameIdsForVariant(DEFAULT_VARIANT_ID);

async function loadSystemPromptMeta(): Promise<string> {
  if (cachedSystemPromptMeta) return cachedSystemPromptMeta;
  const path = join(__dirname, "system-prompt-meta.md");
  const raw = await readFile(path, "utf-8");
  cachedSystemPromptMeta = raw;
  return cachedSystemPromptMeta;
}

async function loadSystemPromptElements(activeGameIds: string[]): Promise<string> {
  const normalized = [...activeGameIds].sort();
  const cacheKey = normalized.join("|");
  const cached = cachedSystemPromptElementsByActiveGameIdsKey.get(cacheKey);
  if (cached) return cached;
  const path = join(__dirname, "system-prompt-elements.md");
  const raw = await readFile(path, "utf-8");
  const activeGameIdsLiteral = `[${normalized.map((id) => JSON.stringify(id)).join(", ")}]`;
  const prompt = raw
    .replace(/\{\{SPRITESHEET_VARIANT_COUNT\}\}/g, String(normalized.length))
    .replace(/\{\{ACTIVE_GAME_IDS\}\}/g, activeGameIdsLiteral);

  cachedSystemPromptElementsByActiveGameIdsKey.set(cacheKey, prompt);
  return prompt;
}

/**
 * Phase 1: Generate only the high-level art direction (meta) from the user's theme.
 * Use this first; then generate the moodboard from meta; then call generateThemeElements.
 */
export async function generateThemeMeta(themeDescription: string): Promise<ThemeManifestMeta> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for Creative Director. Set it in .env.");
  }

  const systemPrompt = await loadSystemPromptMeta();
  const userMessage = `Theme from the user: ${themeDescription}\n\nOutput the meta JSON now. themeDescription must be exactly this theme input.`;

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
          responseSchema: THEME_MANIFEST_META_RESPONSE_SCHEMA,
        },
      });

      const text = response.text?.trim();
      if (!text) {
        lastError = new Error("Empty response from Creative Director (meta)");
        continue;
      }

      const raw = JSON.parse(text) as unknown;
      const parsed = themeManifestMetaSchema.safeParse(raw);

      if (parsed.success) {
        parsed.data.generatedAt = new Date().toISOString();
        return parsed.data;
      }

      lastError = parsed.error;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Creative Director (meta) failed after ${MAX_RETRIES} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

/**
 * Phase 2: Generate element descriptions (spritesheets, title, container, etc.) given the meta
 * and the generated moodboard image. The LLM sees the moodboard and describes elements to match it.
 */
export async function generateThemeElements(
  meta: ThemeManifestMeta,
  moodboardBuffer: Buffer,
  activeGameIds: string[]
): Promise<ThemeManifestElements> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for Creative Director. Set it in .env.");
  }

  const systemPrompt = await loadSystemPromptElements(activeGameIds);
  const metaBlurb = `Current art direction: artStyle="${meta.artStyle}", mood="${meta.mood}", colorPalette=[${meta.colorPalette.join(", ")}]. Theme: ${meta.themeDescription}. Game name (use exactly for titleImage.text): "${meta.gameName}".`;
  const userMessage = `The attached image is the moodboard for this theme. ${metaBlurb}\n\nLook at the moodboard and output the complete elements JSON so that every visualStyle and creative choice matches what you see in the image. For titleImage.text you must use exactly this game name (already set in art direction): "${meta.gameName}". Do not invent different wording.`;

  const ai = new GoogleGenAI({ apiKey });
  const moodboardBase64 = moodboardBuffer.toString("base64");

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: CREATIVE_DIRECTOR_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: userMessage },
              {
                inlineData: {
                  data: moodboardBase64,
                  mimeType: "image/png",
                },
              },
            ],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: THEME_MANIFEST_ELEMENTS_RESPONSE_SCHEMA,
        },
      });

      const text = response.text?.trim();
      if (!text) {
        lastError = new Error("Empty response from Creative Director (elements)");
        continue;
      }

      const raw = JSON.parse(text) as unknown;
      const parsed = themeManifestElementsSchema.safeParse(raw);

      if (parsed.success) {
        return parsed.data;
      }

      lastError = parsed.error;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Creative Director (elements) failed after ${MAX_RETRIES} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

/**
 * Build a full ThemeManifest from meta and elements (after moodboard has been generated).
 * Use when you have already run generateThemeMeta, generated the moodboard, and run generateThemeElements.
 */
export function buildManifestFromMetaAndElements(
  meta: ThemeManifestMeta,
  elements: ThemeManifestElements
): ThemeManifest {
  const manifest: ThemeManifest = { meta, elements };
  manifest.elements.titleImage.text = meta.gameName;
  return manifest;
}

/**
 * Run the full two-step Creative Director pipeline: meta → moodboard → elements → manifest.
 * Returns the manifest and the moodboard buffer so callers can pass the moodboard to orchestration.
 * When options.sourceImage is set, that reference image (e.g. deconstructed moodboard) is re-themed to produce the moodboard.
 * Otherwise the default reference moodboard at apps/server/assets/reference-moodboard.png is used.
 */
export async function runFullDirector(
  themeDescription: string,
  options?: { sourceImage?: Buffer; activeGameIds?: string[] }
): Promise<{
  manifest: ThemeManifest;
  moodboard: Buffer;
}> {
  const { generateMoodboard } = await import("../moodboard.js");
  const { getDefaultReferenceMoodboard } = await import("../reference-moodboard.js");
  const meta = await generateThemeMeta(themeDescription);
  const activeGameIds = options?.activeGameIds ?? DEFAULT_ACTIVE_GAME_IDS;
  const sourceImage = options?.sourceImage ?? (await getDefaultReferenceMoodboard());
  const moodboard = await generateMoodboard(meta, {
    ...(sourceImage && { sourceImage }),
  });
  const elements = await generateThemeElements(meta, moodboard, activeGameIds);
  const manifest = buildManifestFromMetaAndElements(meta, elements);
  return { manifest, moodboard };
}
