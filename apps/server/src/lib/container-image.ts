import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { config } from "../config/index.js";
import { generateImage } from "./gemini.js";

const REFERENCE_IMAGE_PREFIX =
  "Using the exact visual style and colors of the provided reference moodboard image, generate the following. Output only the requested new image, not an edit of the reference.\n\n";

export type ContainerImageType = "solid" | "gradient" | "pattern";

export type GenerateContainerImageParams = {
  type: ContainerImageType;
  width?: number;
  height?: number;
  /** Hex color for solid; primary for gradient/pattern. Default #1a1a2e */
  color?: string;
  /** Second gradient color (hex). Default #16213e */
  colorEnd?: string;
  /** Linear gradient angle in degrees. Default 135 */
  angle?: number;
  /** Pattern style hint for LLM: dots, lines, grid (used when type=pattern). Default dots */
  pattern?: "dots" | "lines" | "grid";
  /** Pattern tile size in px (legacy; used as style hint for procedural solid only). Default 24 */
  patternScale?: number;
  /** Single style input for LLM (gradient/pattern). Same as Creative Director containerBackground.visualStyle. */
  visualStyle?: string;
  /** When set, gradient/pattern generation uses this image as style reference (moodboard) via multimodal API. */
  referenceImage?: Buffer;
};

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 300;
const DEFAULT_COLOR = "#1a1a2e";
const DEFAULT_COLOR_END = "#16213e";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace(/^#/, "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { r: 26, g: 26, b: 46 };
  return {
    r: parseInt(m[1]!, 16),
    g: parseInt(m[2]!, 16),
    b: parseInt(m[3]!, 16),
  };
}

function solidSvg(width: number, height: number, color: string): string {
  const { r, g, b } = hexToRgb(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="rgb(${r},${g},${b})"/>
</svg>`;
}

function colorDescription(hex: string | undefined): string {
  if (!hex) return "";
  return `Color mood: ${hex}.`;
}

function buildGradientPrompt(
  params: GenerateContainerImageParams,
  width: number,
  height: number,
): string {
  const color = params.color ?? DEFAULT_COLOR;
  const colorEnd = params.colorEnd ?? DEFAULT_COLOR_END;
  const visualStyle = params.visualStyle?.trim() ?? "elegant, subtle gradient";
  const parts = [
    "Generate a single image that is only a subtle, high-quality gradient background for a game card container.",
    `Colors: from ${color} to ${colorEnd}. Soft, smooth transition.`,
    "No text, no objects, no logos. The image must fill the entire frame with only the gradient.",
    `Rectangular, suitable for ${width}x${height}. ${visualStyle}.`,
  ];
  return parts.join(" ");
}

function patternStyleHint(pattern: "dots" | "lines" | "grid" | undefined): string {
  if (!pattern) return "subtle and sophisticated";
  const hints: Record<string, string> = {
    dots: "dot-like or stippled motif",
    lines: "linear or striped motif",
    grid: "grid-like or geometric motif",
  };
  return hints[pattern] ?? "subtle and sophisticated";
}

function buildPatternPrompt(
  params: GenerateContainerImageParams,
  width: number,
  height: number,
): string {
  const color = colorDescription(params.color);
  const style = patternStyleHint(params.pattern);
  const visualStyle = params.visualStyle?.trim() ?? "elegant, subtle and sophisticated";
  const parts = [
    "Generate a single image that is only a subtle, sophisticated repeating pattern or texture background for a game card container.",
    `Pattern: ${style}. High quality, low contrast.`,
    "The image should work as a background.",
    color,
    `Rectangular, suitable for ${width}x${height}. ${visualStyle}.`,
  ].filter(Boolean);
  return parts.join(" ");
}

function requireGeminiApiKey(): void {
  if (!config.gemini.apiKey) {
    throw new Error(
      "GEMINI_API_KEY is required for gradient and pattern types. Set it in .env or use type=solid for no API key.",
    );
  }
}

/**
 * Generate a container background image.
 * - Solid: procedural (Sharp only, no API key).
 * - Gradient and pattern: LLM (Gemini); requires GEMINI_API_KEY; then resized to requested dimensions.
 */
export async function generateContainerImage(
  params: GenerateContainerImageParams,
): Promise<Buffer> {
  const width = params.width ?? DEFAULT_WIDTH;
  const height = params.height ?? DEFAULT_HEIGHT;

  if (params.type === "solid") {
    const svg = solidSvg(width, height, params.color ?? DEFAULT_COLOR);
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  if (params.type === "gradient" || params.type === "pattern") {
    requireGeminiApiKey();
    const prompt =
      params.type === "gradient"
        ? buildGradientPrompt(params, width, height)
        : buildPatternPrompt(params, width, height);
    const fullPrompt = params.referenceImage ? REFERENCE_IMAGE_PREFIX + prompt : prompt;
    const buffer = await generateImage(fullPrompt, params.referenceImage);
    return sharp(buffer).resize(width, height).png().toBuffer();
  }

  const svg = solidSvg(width, height, params.color ?? DEFAULT_COLOR);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Next sequential 4-digit ID for container-image debug (0001, 0002, …). */
export async function nextContainerImageDebugId(debugDir: string): Promise<string> {
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
    // directory missing or unreadable
  }
  return String(maxId + 1).padStart(4, "0");
}

function slugFromParams(params: GenerateContainerImageParams, maxLen = 50): string {
  const parts = [
    params.type,
    params.pattern ?? "",
    params.color ?? "",
    params.colorEnd ?? "",
  ].filter(Boolean);
  const slug = parts
    .join("-")
    .toLowerCase()
    .replace(/^#/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug.slice(0, maxLen) || params.type;
}

export type WriteContainerImageDebugParams = GenerateContainerImageParams;

/**
 * When config.debug.containerImage is set, write the buffer there as NNNN-slug.png
 * and append a line to container-image-log.txt. No-op when debug output dir is not set.
 */
export async function writeContainerImageDebug(
  buffer: Buffer,
  params: WriteContainerImageDebugParams,
): Promise<void> {
  const debugDir = config.debug.containerImage;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const debugId = await nextContainerImageDebugId(debugDir);
  const slug = slugFromParams(params);
  const filename = `${debugId}-${slug}.png`;
  const filePath = join(debugDir, filename);
  await writeFile(filePath, buffer);
  const logPath = join(debugDir, "container-image-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\ttype=${params.type}\tpattern=${params.pattern ?? ""}\tcolor=${params.color ?? ""}\tvisualStyle="${params.visualStyle ?? ""}"\tfile=${filename}\n`;
  await appendFile(logPath, line);
}
