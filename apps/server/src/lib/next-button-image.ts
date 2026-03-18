import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../config/index.js";
import { cropTransparentToContent } from "./crop-to-content.js";
import { extractAlphaTwoPassFromBuffers } from "./extractAlpha.js";
import { generateImage } from "./gemini.js";
import { swapBackground } from "./spritesheet/swap-background.js";

const REFERENCE_IMAGE_PREFIX =
  "The attached image is a tagged moodboard (sections may include Graphic Style, Typography, Color Palette, Background Style). For this asset: combine Graphic Style (art direction, materials, lighting), Color Palette (fills, borders, highlights, glow), and Typography (how the button label is lettered—weight, texture, color). Do not recreate the moodboard layout, full scenes, or backgrounds. You output ONE isolated UI control: a single themed CTA button on pure white outside the control.\n\n";

export type GenerateNextButtonImageParams = {
  /** Button label to render (default: "Next"). */
  text: string;
  /** Full control look: shape, materials, chrome, glow, and label typography. */
  visualStyle: string;
  /** When set, generation uses this image as style reference (moodboard) via multimodal API. */
  referenceImage?: Buffer;
};

function nextVisualStyleConstraintsText(text: string): string {
  return `Apply visualStyle to the whole control: button shape (rounded rectangle, pill, etc.), fill, border or bevel, optional glow or shine, and the centered label "${text}" using the described typography.

The canvas MUST be pure solid white #FFFFFF in every pixel outside the button silhouette. Inside the silhouette: one clear clickable-looking CTA with the exact label "${text}" centered. No second button, no icons besides the label, no HUD, no card chrome, no decorative scene outside the button.`;
}

function sanitizeNextButtonVisualStyleHeuristics(style: string): string {
  let s = style.trim();
  const lower = s.toLowerCase();
  // Strip only phrasing that drags the model into full scenes (keep button border/bevel language).
  const truncationKeywords = [
    "background scene",
    "full scratch card",
    "entire card",
    "game board",
    "hud elements",
    "multiple buttons",
    "second button",
  ];

  for (const keyword of truncationKeywords) {
    const idx = lower.indexOf(keyword);
    if (idx !== -1) {
      s = s.slice(0, idx).trim();
      break;
    }
  }

  s = s.replace(/\s{2,}/g, " ").trim();
  if (s.length > 600) {
    s = `${s.slice(0, 597).trim()}…`;
  }
  return s;
}

function buildPrompt(params: GenerateNextButtonImageParams): string {
  const { text, visualStyle } = params;
  const parts = [
    `Generate one image: a single themed "Next" CTA button — clearly tappable-looking (raised or inset, border/bevel/gloss as fits the style), with the label "${text}" centered and readable.`,
    visualStyle.trim(),
    nextVisualStyleConstraintsText(text),
    "Outside the button shape: only pure white #FFFFFF. No shadows cast onto a colored floor; any drop shadow must sit on white or be subtle within the button silhouette.",
    `CRITICAL: Exactly one button. Label must read "${text}". No extra text, no duplicate controls, no full-game mockup.`,
  ];
  return parts.join(" ");
}

/**
 * Generate a transparent PNG of the themed Next CTA button (shape + label).
 *
 * Renders on pure white outside the control, then white→black swap + alpha extraction.
 */
export async function generateNextButtonImage(
  params: GenerateNextButtonImageParams,
): Promise<Buffer> {
  const originalStyle = params.visualStyle;
  const visualStyle = sanitizeNextButtonVisualStyleHeuristics(originalStyle);

  const prompt = buildPrompt({ ...params, visualStyle });
  const fullPrompt = params.referenceImage ? REFERENCE_IMAGE_PREFIX + prompt : prompt;

  const whiteBuffer = await generateImage(fullPrompt, params.referenceImage);
  const blackBuffer = await swapBackground(whiteBuffer, "white", "black");
  let buffer = await extractAlphaTwoPassFromBuffers(whiteBuffer, blackBuffer);
  buffer = await cropTransparentToContent(buffer, { padding: 16 });
  return buffer;
}

/** Next sequential 4-digit ID for next-button debug (0001, 0002, …). */
export async function nextNextButtonImageDebugId(debugDir: string): Promise<string> {
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

function slugFromParams(params: GenerateNextButtonImageParams, maxLen = 40): string {
  const s = [params.text, params.visualStyle].filter(Boolean).join(" ");
  const slug = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug.slice(0, maxLen) || "next";
}

export type WriteNextButtonImageDebugParams = GenerateNextButtonImageParams;

/**
 * When config.debug.nextButtonImage is set, write the buffer there as NNNN-slug.png
 * and append a line to next-button-image-log.txt. No-op when debug output dir is not set.
 */
export async function writeNextButtonImageDebug(
  buffer: Buffer,
  params: WriteNextButtonImageDebugParams,
): Promise<void> {
  const debugDir = config.debug.nextButtonImage;
  if (!debugDir) return;

  await mkdir(debugDir, { recursive: true });
  const debugId = await nextNextButtonImageDebugId(debugDir);
  const slug = slugFromParams(params);
  const filename = `${debugId}-${slug}.png`;
  const filePath = join(debugDir, filename);
  await writeFile(filePath, buffer);

  const logPath = join(debugDir, "next-button-image-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\ttext="${params.text}"\tvisualStyle="${params.visualStyle}"\tfile=${filename}\n`;
  await appendFile(logPath, line);
}

