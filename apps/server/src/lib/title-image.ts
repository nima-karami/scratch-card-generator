import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../config/index.js";
import { extractAlphaTwoPassFromBuffers } from "./extractAlpha.js";
import { generateImage } from "./gemini.js";
import { swapBackground } from "./spritesheet/swap-background.js";

const REFERENCE_IMAGE_PREFIX =
  "The attached image is a full scratch card game (it may show game boards, grids, coins, scratch areas, borders, and other UI). You are NOT generating a scratch card. You are ONLY generating a standalone TITLE GRAPHIC: the title words as styled text. Use the attached image PURELY as a style guide for the typography's colors, lighting, and textures. DO NOT include game boards, grids, coins, scratch areas, borders, or any other UI elements from the reference. Output ONLY the title graphic.\n\n";

export type GenerateTitleImageParams = {
  text: string;
  visualStyle: string;
  /** When set, generation uses this image as style reference (moodboard) via multimodal API. */
  referenceImage?: Buffer;
};

function buildPrompt(params: GenerateTitleImageParams): string {
  const { text, visualStyle } = params;
  const parts = [
    `Generate a single image that displays the following title text prominently and clearly: "${text}".`,
    visualStyle.trim(),
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
  const prompt = buildPrompt(params);
  const fullPrompt = params.referenceImage ? REFERENCE_IMAGE_PREFIX + prompt : prompt;
  const whiteBuffer = await generateImage(fullPrompt, params.referenceImage);
  const blackBuffer = await swapBackground(whiteBuffer, "white", "black");
  return extractAlphaTwoPassFromBuffers(whiteBuffer, blackBuffer);
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
