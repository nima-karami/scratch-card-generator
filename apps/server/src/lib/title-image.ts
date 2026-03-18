import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../config/index.js";
import { cropTransparentToContent } from "./crop-to-content.js";
import { extractAlphaTwoPassFromBuffers } from "./extractAlpha.js";
import { generateImage } from "./gemini.js";
import { sanitizeTextWithLLM } from "./llm/text-sanitizer.js";
import { swapBackground } from "./spritesheet/swap-background.js";

const REFERENCE_IMAGE_PREFIX =
  "The attached image is a tagged moodboard with sections: Graphic Style, Typography, Color Palette, Background Style. For this task use ONLY the TYPOGRAPHY section as your style reference (the sample title/h headline treatment). Ignore all other sections. You are generating a standalone TITLE GRAPHIC: the title words as styled text. Match the typography's colors, lighting, textures, and treatment from the Typography section only. Do not copy the layout of the full moodboard. Output ONLY the title graphic.\n\n";

export type GenerateTitleImageParams = {
  text: string;
  visualStyle: string;
  /** When set, generation uses this image as style reference (moodboard) via multimodal API. */
  referenceImage?: Buffer;
};

const TITLE_VISUALSTYLE_CONSTRAINTS_TEXT = `The title image visualStyle MUST be typography-only.
Allowed: font weight/style, letter outlines/strokes, fill color usage, distressed texture, halftone/print texture INSIDE the letters, shadow/drop-shadow, subtle glow/inner effects, and decorative letter-adjacent ornaments that are part of the typography treatment (e.g. water drops/splashes, beach spritz, small shell/bubble accents, small leaf-like flourishes near letters).
Forbidden: any framing/layout description that indicates an external frame or surrounding composition (anything implying “around the title/letters” as a container), borders around the whole title, or any background/scene composition OUTSIDE the letters.
Important: keep small letter-adjacent ornaments even if they contain words like “leaf” or “foliage”, as long as they are described as ornamentation attached to or immediately next to the letters (not a full surrounding frame/background).
The sanitized output will be embedded into an instruction that also states the image must be ONLY the title words on a solid white background.`;

function sanitizeTitleVisualStyleHeuristics(style: string): string {
  let s = style.trim();
  const lower = s.toLowerCase();

  const truncationKeywords = [
    "framed by",
    "surrounded by",
    "bordered by",
    "in a frame",
    "with a frame",
    "framing the",
    "around the title",
    "around the letters",
    "surrounding the title",
    "surrounding the letters",
    "in the background",
    "background scene",
  ];
  for (const keyword of truncationKeywords) {
    const idx = lower.indexOf(keyword);
    if (idx !== -1) {
      s = s.slice(0, idx).trim();
      break;
    }
  }

  // Intentionally do NOT strip generic foliage/leaf terms here.
  // The sanitizer is responsible for removing external-frame/background instructions,
  // while we must keep letter-adjacent ornaments (e.g. a water drop next to the text).
  // This heuristic only truncates obvious framing phrases above.
  s = s.replace(/\s{2,}/g, " ").trim();

  return s;
}

function buildPrompt(params: GenerateTitleImageParams): string {
  const { text, visualStyle } = params;
  const parts = [
    `Generate a single image that displays the following title text prominently and clearly: "${text}".`,
    visualStyle.trim(),
    "Treat the provided visualStyle as typography-only. Ignore any framing/background/scene instructions embedded within it. Only describe letter rendering (strokes/fill/textures/shadows) for the words.",
    "The image must be on a pure solid white #FFFFFF background with no other background elements.",
    `CRITICAL CONSTRAINTS: Output ONLY the words "${text}". The background MUST be pure solid white #FFFFFF. Absolutely no other objects, no secondary text, and no game UI.`,
  ];
  return parts.join(" ");
}

/**
 * Generate a title image from text and optional style params using Gemini.
 * Generates on pure white, then runs swap-background (white→black) and alpha extraction.
 * Returns a PNG buffer with transparent background.
 */
export async function generateTitleImage(params: GenerateTitleImageParams): Promise<Buffer> {
  // Prevent prompt conflicts where creative direction accidentally includes full "framed by foliage"
  // scene descriptions, even though the generator must output ONLY typography on solid white.
  const originalStyle = params.visualStyle;
  if (originalStyle.trim()) {
    let sanitized = originalStyle;
    try {
      sanitized = await sanitizeTextWithLLM({
        inputText: originalStyle,
        constraintsText: TITLE_VISUALSTYLE_CONSTRAINTS_TEXT,
        maxRetries: 2,
      });
    } catch {
      // LLM sanitizer failure should never crash title generation.
    }
    sanitized = sanitizeTitleVisualStyleHeuristics(sanitized);
    if (!sanitized.trim()) sanitized = sanitizeTitleVisualStyleHeuristics(originalStyle);
    params.visualStyle = sanitized;
  }

  const prompt = buildPrompt(params);
  const fullPrompt = params.referenceImage ? REFERENCE_IMAGE_PREFIX + prompt : prompt;
  const whiteBuffer = await generateImage(fullPrompt, params.referenceImage);
  const blackBuffer = await swapBackground(whiteBuffer, "white", "black");
  let buffer = await extractAlphaTwoPassFromBuffers(whiteBuffer, blackBuffer);
  buffer = await cropTransparentToContent(buffer, { padding: 16 });
  return buffer;
}

/** Next sequential 4-digit ID for title-image debug (0001, 0002, …). Scans dir for existing NNNN-*.png filenames. */
export async function nextTitleImageDebugId(debugDir: string): Promise<string> {
  const prefixMatch = /^(\d{4})-/;
  let maxId = 0;
  try {
    const files = await readdir(debugDir);
    for (const name of files) {
      const m = name.match(prefixMatch);
      if (m) {
        const n = parseInt(m[1]!, 10);
        if (n > maxId) maxId = n;
      }
    }
  } catch {
    // directory missing or unreadable; next id will be 0001
  }
  return String(maxId + 1).padStart(4, "0");
}

function slugFromParams(params: GenerateTitleImageParams, maxLen = 40): string {
  const s = [params.text, params.visualStyle].filter(Boolean).join(" ");
  const slug = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug.slice(0, maxLen) || "title";
}

export type WriteTitleImageDebugParams = GenerateTitleImageParams;

/**
 * When config.debug.titleImage is set, write the buffer there as NNNN-slug.png
 * and append a line to title-image-log.txt. No-op when debug output dir is not set.
 */
export async function writeTitleImageDebug(
  buffer: Buffer,
  params: WriteTitleImageDebugParams,
): Promise<void> {
  const debugDir = config.debug.titleImage;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const debugId = await nextTitleImageDebugId(debugDir);
  const slug = slugFromParams(params);
  const filename = `${debugId}-${slug}.png`;
  const filePath = join(debugDir, filename);
  await writeFile(filePath, buffer);
  const logPath = join(debugDir, "title-image-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\ttext="${params.text}"\tvisualStyle="${params.visualStyle}"\tfile=${filename}\n`;
  await appendFile(logPath, line);
}
