import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { config } from "../../config/index.js";
import type { SSEEvent } from "@repo/shared";
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
export async function generateThemeMeta(
  themeDescription: string,
  onProgress?: (event: SSEEvent) => void,
): Promise<ThemeManifestMeta> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for Creative Director. Set it in .env.");
  }

  const systemPrompt = await loadSystemPromptMeta();
  const userMessage = `Theme from the user: ${themeDescription}\n\nOutput the meta JSON now. themeDescription must be exactly this theme input.`;

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  const nearWhiteThreshold = 240;
  const parseHexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const normalized = hex.trim().toLowerCase();
    const m = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return null;

    let h = m[1]!;
    if (h.length === 3) {
      // Expand #RGB to #RRGGBB.
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }

    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
    return { r, g, b };
  };

  const isNearWhite = (hex: string): boolean => {
    const rgb = parseHexToRgb(hex);
    if (!rgb) return false;
    return rgb.r >= nearWhiteThreshold && rgb.g >= nearWhiteThreshold && rgb.b >= nearWhiteThreshold;
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      onProgress?.({
        type: "designing",
        message: `Designing your theme (meta) — attempt ${attempt}/${MAX_RETRIES}`,
      });
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
        // Reject palettes that can cause alpha extraction to erase typography/glyphs.
        // (See apps/server/src/lib/extractAlpha.ts nearWhiteThreshold behavior.)
        const paletteTokens = parsed.data.colorPalette;
        const tokensToProtect = [
          paletteTokens.foreground,
          paletteTokens.primary,
          paletteTokens.secondary,
          paletteTokens.accent,
        ];
        const anyProtectedTokenNearWhite = tokensToProtect.some((c) => isNearWhite(c));
        if (anyProtectedTokenNearWhite) {
          lastError = new Error(
            `Creative Director (meta) produced a near-white protected palette token (threshold RGB >= ${nearWhiteThreshold} for all channels).`,
          );
          continue;
        }

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
  activeGameIds: string[],
  onProgress?: (event: SSEEvent) => void
): Promise<ThemeManifestElements> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for Creative Director. Set it in .env.");
  }

  const systemPrompt = await loadSystemPromptElements(activeGameIds);
  const cp = meta.colorPalette;
  const metaBlurb = `Current art direction: artStyle="${meta.artStyle}", mood="${meta.mood}", colorPalette={background:"${cp.background}", foreground:"${cp.foreground}", primary:"${cp.primary}", secondary:"${cp.secondary}", accent:"${cp.accent}"}. Theme: ${meta.themeDescription}. Game name (use exactly for titleImage.text): "${meta.gameName}".`;
  const userMessage = `The attached image is the moodboard for this theme. ${metaBlurb}\n\nLook at the moodboard and output the complete elements JSON so that every visualStyle and creative choice matches what you see in the image. For titleImage.text you must use exactly this game name (already set in art direction): "${meta.gameName}". Do not invent different wording.`;

  const ai = new GoogleGenAI({ apiKey });
  const moodboardBase64 = moodboardBuffer.toString("base64");

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      onProgress?.({
        type: "designing",
        message: `Designing your theme (elements) — attempt ${attempt}/${MAX_RETRIES}`,
      });
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
        const validateTypographyVisualStyles = (): Error | null => {
          const elements = parsed.data;
          const cp = meta.colorPalette;

          const normalizeHexTo6 = (hex: string): string | null => {
            const normalized = hex.trim().toLowerCase();
            const m6 = normalized.match(/^#([0-9a-f]{6})$/i);
            if (m6) return `#${m6[1]!.toLowerCase()}`;
            const m3 = normalized.match(/^#([0-9a-f]{3})$/i);
            if (m3) {
              const a = m3[1]!;
              return `#${a[0]}${a[0]}${a[1]}${a[1]}${a[2]}${a[2]}`.toLowerCase();
            }
            return null;
          };

          const parseHexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
            const h = normalizeHexTo6(hex);
            if (!h) return null;
            const r = parseInt(h.slice(1, 3), 16);
            const g = parseInt(h.slice(3, 5), 16);
            const b = parseInt(h.slice(5, 7), 16);
            if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
            return { r, g, b };
          };

          const rgbDistance = (aHex: string, bHex: string): number | null => {
            const a = parseHexToRgb(aHex);
            const b = parseHexToRgb(bHex);
            if (!a || !b) return null;
            const dr = a.r - b.r;
            const dg = a.g - b.g;
            const db = a.b - b.b;
            return Math.sqrt(dr * dr + dg * dg + db * db);
          };

          const backgroundHex = normalizeHexTo6(cp.background);
          if (!backgroundHex) return new Error("Creative Director (elements) produced invalid background hex.");

          const tokenH = [
            normalizeHexTo6(cp.foreground),
            normalizeHexTo6(cp.primary),
            normalizeHexTo6(cp.secondary),
            normalizeHexTo6(cp.accent),
          ].filter((x): x is string => x != null);

          if (tokenH.length === 0) return new Error("Creative Director (elements) produced invalid palette tokens.");

          // Threshold for "too close to background" — tuned to prevent background-like lettering.
          const minRgbDistanceFromBackground = 60;

          const closeTokenH = new Set<string>(
            tokenH
              .map((t) => {
                const d = rgbDistance(t, backgroundHex);
                return d != null && d < minRgbDistanceFromBackground ? t : null;
              })
              .filter((x): x is string => x != null)
          );

          const requireAtLeastOneTokenHexMentioned = (label: string, vs: string): Error | null => {
            const vsLower = vs.toLowerCase();
            const hasAnyTokenHex = tokenH.some((t) => vsLower.includes(t));
            if (!hasAnyTokenHex) {
              return new Error(`${label}.visualStyle must include at least one palette token hex verbatim.`);
            }
            return null;
          };

          const validateVisualStyle = (label: string, vs: string | undefined): Error | null => {
            if (!vs) return null;
            const vsLower = vs.toLowerCase();

            if (vsLower.includes(backgroundHex)) {
              return new Error(`${label}.visualStyle must not include background hex ${backgroundHex}.`);
            }

            const missingTokenErr = requireAtLeastOneTokenHexMentioned(label, vs);
            if (missingTokenErr) return missingTokenErr;

            for (const closeToken of closeTokenH) {
              if (vsLower.includes(closeToken)) {
                return new Error(
                  `${label}.visualStyle uses a palette token too close to background (token ${closeToken} distance < ${minRgbDistanceFromBackground}).`
                );
              }
            }

            return null;
          };

          return (
            validateVisualStyle("winMessageImage", elements.winMessageImage?.visualStyle) ||
            validateVisualStyle("numbersHeaderImage", elements.numbersHeaderImage?.visualStyle) ||
            validateVisualStyle("glyphSheet", elements.glyphSheet.visualStyle) ||
            validateVisualStyle("nextButtonImage", elements.nextButtonImage?.visualStyle)
          );
        };

        const validationError = validateTypographyVisualStyles();
        if (validationError) {
          lastError = validationError;
          continue;
        }

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
  options?: { sourceImage?: Buffer; activeGameIds?: string[]; onProgress?: (event: SSEEvent) => void }
): Promise<{
  manifest: ThemeManifest;
  moodboard: Buffer;
}> {
  const { generateMoodboard } = await import("../moodboard.js");
  const { getDefaultReferenceMoodboard } = await import("../reference-moodboard.js");
  const meta = await generateThemeMeta(themeDescription, options?.onProgress);
  const activeGameIds = options?.activeGameIds ?? DEFAULT_ACTIVE_GAME_IDS;
  const sourceImage = options?.sourceImage ?? (await getDefaultReferenceMoodboard());
  options?.onProgress?.({ type: "designing", message: "Designing your theme (moodboard)..." });
  const moodboard = await generateMoodboard(meta, {
    ...(sourceImage && { sourceImage }),
    onProgress: options?.onProgress,
  });
  options?.onProgress?.({ type: "designing", message: "Designing your theme (elements)..." });
  const elements = await generateThemeElements(meta, moodboard, activeGameIds, options?.onProgress);
  const manifest = buildManifestFromMetaAndElements(meta, elements);
  return { manifest, moodboard };
}
