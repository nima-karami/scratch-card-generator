import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { config } from "../../config/index.js";
import { editImage } from "../gemini.js";
import { extractAlphaTwoPassFromBuffers } from "../extractAlpha.js";
import { swapBackground } from "../spritesheet/swap-background.js";

/** Glyph order: index 0 = $, 1 = ,, 2 = 0, … 11 = 9. Use when compositing strings like $1,000. */
export const GLYPH_ORDER = ["$", ",", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
export const GLYPH_COUNT = GLYPH_ORDER.length;

export interface GenerateGlyphSheetParams {
  /** Predefined glyph sheet image (12 glyphs on solid background, e.g. white). */
  baseImageBuffer: Buffer;
  /** Style for stylization. Same as Creative Director glyphSheet.visualStyle. */
  visualStyle: string;
  cols: number;
  rows: number;
}

export interface GenerateGlyphSheetResult {
  /** Transparent PNG of the full stylized glyph sheet. */
  transparent: Buffer;
  /** If slice was requested, one PNG per glyph in GLYPH_ORDER (12 buffers). */
  slices?: Buffer[];
}

function buildStylizePrompt(visualStyle: string): string {
  return `Restyle this glyph sheet image to match the following style: ${visualStyle}.

Rules:
- Preserve the exact layout and character positions. Do not move, resize, or rearrange any glyph.
- Only change colors and texture to match the style. Keep each character readable and recognizable.
- Every glyph must use the exact same overall "color recipe" (fill + outline/glow/highlight colors), plus the same texture and effects. No alternating or per-character color variation.
- If the provided style describes multiple colors (e.g. a dominant foreground fill with an accent/primary outline or glow), apply that same multi-color recipe identically to every glyph.
- Keep the background pure solid white #FFFFFF.`;
}

/** Next sequential 4-digit ID for glyph-sheet debug (0001, 0002, …). */
async function nextGlyphSheetDebugId(debugDir: string): Promise<string> {
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

function visualStyleSlug(visualStyle: string, maxLen = 30): string {
  return visualStyle
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, maxLen) || "glyph-sheet";
}

async function writeGlyphSheetDebug(
  whiteBuffer: Buffer,
  blackBuffer: Buffer,
  transparentBuffer: Buffer,
  params: { visualStyle: string; inputPath?: string },
  success: boolean,
): Promise<void> {
  const debugDir = config.debug.glyphSheet;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const debugId = await nextGlyphSheetDebugId(debugDir);
  const slug = visualStyleSlug(params.visualStyle);
  await writeFile(join(debugDir, `${debugId}-${slug}-white.png`), whiteBuffer);
  await writeFile(join(debugDir, `${debugId}-${slug}-black.png`), blackBuffer);
  await writeFile(join(debugDir, `${debugId}-${slug}-transparent.png`), transparentBuffer);
  const logPath = join(debugDir, "glyph-sheet-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\tvisualStyle="${params.visualStyle}"\tinput=${params.inputPath ?? ""}\tsuccess=${success}\n`;
  await appendFile(logPath, line);
}

/**
 * Generates a theme-stylized, transparent glyph sheet from a predefined base image.
 * Pipeline: stylize via Gemini (preserve layout) → swap background to black → extract alpha.
 */
export async function generateGlyphSheet(
  params: GenerateGlyphSheetParams,
  options?: { slice?: boolean; inputPath?: string },
): Promise<GenerateGlyphSheetResult> {
  const { baseImageBuffer, visualStyle, cols, rows } = params;
  const prompt = buildStylizePrompt(visualStyle);
  const whiteBuffer = await editImage(baseImageBuffer, prompt);
  const blackBuffer = await swapBackground(whiteBuffer, "white", "black");
  const transparent = await extractAlphaTwoPassFromBuffers(whiteBuffer, blackBuffer);

  if (config.debug.glyphSheet) {
    await writeGlyphSheetDebug(
      whiteBuffer,
      blackBuffer,
      transparent,
      { visualStyle, inputPath: options?.inputPath },
      true,
    );
  }

  let slices: Buffer[] | undefined;
  if (options?.slice) {
    const meta = await sharp(transparent).metadata();
    const width = meta.width!;
    const height = meta.height!;
    const cellWidth = Math.floor(width / cols);
    const cellHeight = Math.floor(height / rows);
    slices = [];
    for (let i = 0; i < GLYPH_COUNT; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const left = col * cellWidth;
      const top = row * cellHeight;
      const buf = await sharp(transparent)
        .extract({ left, top, width: cellWidth, height: cellHeight })
        .png()
        .toBuffer();
      slices.push(buf);
    }
  }

  return { transparent, slices };
}
