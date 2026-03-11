import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../config.js";
import { extractAlphaTwoPassFromBuffers } from "./extractAlpha.js";
import { generateImage } from "./gemini.js";
import { swapBackground } from "./spritesheet/swap-background.js";

export type GenerateTitleImageParams = {
  text: string;
  prompt?: string;
  theme?: string;
  colors?: string;
};

function buildPrompt(params: GenerateTitleImageParams): string {
  const { text, prompt = "", theme = "elegant", colors = "gold and dark" } = params;
  const parts = [
    `Generate a single image that displays the following title text prominently and clearly: «${text}».`,
    `Style: ${theme}.`,
  ];
  if (prompt) parts.push(prompt.trim());
  parts.push(`Color palette: ${colors}.`);
  parts.push(
    "The image must be on a pure solid white #FFFFFF background with no other background elements.",
  );
  return parts.join(" ");
}

/**
 * Generate a title image from text and optional style params using Gemini.
 * Generates on pure white, then runs swap-background (white→black) and alpha extraction.
 * Returns a PNG buffer with transparent background.
 */
export async function generateTitleImage(params: GenerateTitleImageParams): Promise<Buffer> {
  const prompt = buildPrompt(params);
  const whiteBuffer = await generateImage(prompt);
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
  const s = [params.text, params.theme, params.prompt].filter(Boolean).join(" ");
  const slug = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug.slice(0, maxLen) || "title";
}

export type WriteTitleImageDebugParams = GenerateTitleImageParams;

/**
 * When config.titleImage.debugOutputDir is set, write the buffer there as NNNN-slug.png
 * and append a line to title-image-log.txt. No-op when debug output dir is not set.
 */
export async function writeTitleImageDebug(
  buffer: Buffer,
  params: WriteTitleImageDebugParams,
): Promise<void> {
  const debugDir = config.titleImage.debugOutputDir;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const debugId = await nextTitleImageDebugId(debugDir);
  const slug = slugFromParams(params);
  const filename = `${debugId}-${slug}.png`;
  const filePath = join(debugDir, filename);
  await writeFile(filePath, buffer);
  const logPath = join(debugDir, "title-image-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\ttext="${params.text}"\ttheme=${params.theme ?? ""}\tprompt="${params.prompt ?? ""}"\tcolors="${params.colors ?? ""}"\tfile=${filename}\n`;
  await appendFile(logPath, line);
}
