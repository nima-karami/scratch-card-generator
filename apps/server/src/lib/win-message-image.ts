import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../config/index.js";
import { cropTransparentToContent } from "./crop-to-content.js";
import { extractAlphaTwoPassFromBuffers } from "./extractAlpha.js";
import { generateImage } from "./gemini.js";
import { swapBackground } from "./spritesheet/swap-background.js";

const REFERENCE_IMAGE_PREFIX =
  "The attached image is a tagged moodboard with sections: Graphic Style, Typography, Color Palette, Background Style. For this task use ONLY the TYPOGRAPHY section as your style reference (the sample title/h headline treatment). Ignore all other sections. You are generating a standalone WIN MESSAGE graphic: the fixed win words as styled text. Match the typography's colors, lighting, textures, and treatment from the Typography section only. Do not copy the layout of the full moodboard. Output ONLY the win message graphic.\n\n";

export type GenerateWinMessageImageParams = {
  /**
   * Win message words to render (defaulted by orchestrator/CLI).
   * Note: integration uses fixed wording; this exists for CLI/debug override.
   */
  text: string;
  visualStyle: string;
  /** When set, generation uses this image as style reference (moodboard) via multimodal API. */
  referenceImage?: Buffer;
};

function buildPrompt(params: GenerateWinMessageImageParams): string {
  const { text, visualStyle } = params;
  const trimmedStyle = visualStyle.trim();
  const parts = [
    `Generate a single image that displays the following win message text prominently and clearly: "${text}".`,
    trimmedStyle,
    "The image must be on a pure solid white #FFFFFF background with no other background elements.",
    `CRITICAL CONSTRAINTS: Output ONLY the words "${text}". The background MUST be pure solid white #FFFFFF. Absolutely no other objects, no secondary text, and no game UI.`,
  ];
  return parts.join(" ");
}

/**
 * Generate a win message image from text and optional style params using Gemini.
 * Generates on pure white, then runs swap-background (white→black) and alpha extraction.
 * Returns a PNG buffer with transparent background.
 */
export async function generateWinMessageImage(
  params: GenerateWinMessageImageParams,
): Promise<Buffer> {
  const prompt = buildPrompt(params);
  const fullPrompt = params.referenceImage ? REFERENCE_IMAGE_PREFIX + prompt : prompt;
  const whiteBuffer = await generateImage(fullPrompt, params.referenceImage);
  const blackBuffer = await swapBackground(whiteBuffer, "white", "black");
  let buffer = await extractAlphaTwoPassFromBuffers(whiteBuffer, blackBuffer);
  buffer = await cropTransparentToContent(buffer, { padding: 16 });
  return buffer;
}

/** Next sequential 4-digit ID for win-message-image debug (0001, 0002, …). */
export async function nextWinMessageImageDebugId(debugDir: string): Promise<string> {
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

function slugFromParams(params: GenerateWinMessageImageParams, maxLen = 40): string {
  const s = [params.text, params.visualStyle].filter(Boolean).join(" ");
  const slug = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug.slice(0, maxLen) || "win-message";
}

export type WriteWinMessageImageDebugParams = GenerateWinMessageImageParams;

/**
 * When config.debug.winMessageImage is set, write the buffer there as NNNN-slug.png
 * and append a line to win-message-image-log.txt. No-op when debug output dir is not set.
 */
export async function writeWinMessageImageDebug(
  buffer: Buffer,
  params: WriteWinMessageImageDebugParams,
): Promise<void> {
  const debugDir = config.debug.winMessageImage;
  if (!debugDir) return;

  await mkdir(debugDir, { recursive: true });
  const debugId = await nextWinMessageImageDebugId(debugDir);
  const slug = slugFromParams(params);
  const filename = `${debugId}-${slug}.png`;
  const filePath = join(debugDir, filename);
  await writeFile(filePath, buffer);

  const logPath = join(debugDir, "win-message-image-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\ttext="${params.text}"\tvisualStyle="${params.visualStyle}"\tfile=${filename}\n`;
  await appendFile(logPath, line);
}

