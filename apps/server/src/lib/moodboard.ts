import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../config/index.js";
import { generateImage } from "./gemini.js";
import type { ThemeManifestMeta } from "./creative-director/types.js";

export interface GenerateMoodboardOptions {
  /** When set, this reference image is used only as a layout example (four labeled sections); content for each section is created new from the meta, not copied from the reference. */
  sourceImage?: Buffer;
}

/**
 * Builds a text prompt for generating a moodboard using the reference image only as a layout example.
 * The reference shows four labeled sections (Graphic Style, Typography, Color Palette, Background Style);
 * the model must create entirely new content for each section and must not copy the reference's imagery.
 */
function buildRethemeMoodboardPrompt(meta: ThemeManifestMeta): string {
  const colors = meta.colorPalette.join(", ");
  const parts = [
    "A structured design moodboard on a solid light gray background, consisting of white, rounded-rectangle panels. The layout is divided into two main columns. The attached image is only a structural layout example; do not copy or adapt its imagery, patterns, or composition.",
    `The overall theme is ${meta.themeDescription}, with a ${meta.mood} mood and a ${meta.artStyle} style.`,
    "Left column (three stacked square panels):",
    "1. Top left panel: Above the panel, the explicit small text 'Graphic Style'. Inside the panel: A single, centered game object illustration representing the theme on a clean background.",
    "2. Middle left panel: Above the panel, the explicit small text 'Typography'. Inside the panel: A large, stylized title text design appropriate for the theme.",
    `3. Bottom left panel: Above the panel, the explicit small text 'Color Palette'. Inside the panel: Vertical color swatches representing these exact hex codes: ${colors}.`,
    "Right column (one tall vertical panel):",
    "4. Large right panel: Above the panel, the explicit small text 'Background Style'. Inside the panel: A new full-bleed patterned or textured background designed for this theme, matching the color palette.",
    "Output a single image with this exact four-panel structure and explicit text labels. Keep each section clearly isolated. Do not produce a full scratch card or game layout — only this tagged moodboard.",
  ];
  return parts.join(" ");
}

/**
 * Builds a text prompt for a single moodboard image (no source) in the same 4-panel tagged format
 * as the default reference, so downstream tasks know which section to use.
 */
function buildMoodboardPrompt(meta: ThemeManifestMeta): string {
  const colors = meta.colorPalette.join(", ");
  const parts = [
    "Generate a single moodboard image that will be used as the visual style reference for a scratch card game. It must have four clearly labeled sections, arranged in a single image:",
    "(1) Graphic Style — one or two sample objects or icons for the theme (e.g. a cookie, a gem), on a plain background.",
    "(2) Typography — sample title or headline text (e.g. two words) in the same style, showing how the title should look.",
    "(3) Color Palette — a row of color swatches using exactly these hex colors: " + colors + ".",
    "(4) Background Style — a patterned or textured background area (no game UI, no grids).",
    `Theme: ${meta.themeDescription}. Art style: ${meta.artStyle}. Mood: ${meta.mood}.`,
    "Keep the four sections visually distinct and labeled. Do not produce a full scratch card layout. This moodboard will be used so that title generation uses the Typography section, background generation uses the Background Style section, and game objects use the Graphic Style section.",
  ];
  return parts.join(" ");
}

/**
 * Generates a master moodboard image from the theme meta. This image should be passed
 * to generateThemeElements and to all visual asset generators as the style anchor.
 * When options.sourceImage is provided, that reference image (e.g. deconstructed collage) is re-themed with the meta to produce the moodboard.
 */
export async function generateMoodboard(
  meta: ThemeManifestMeta,
  options?: GenerateMoodboardOptions,
): Promise<Buffer> {
  const buffer =
    options?.sourceImage != null
      ? await generateImage(buildRethemeMoodboardPrompt(meta), options.sourceImage)
      : await generateImage(buildMoodboardPrompt(meta));

  const debugDir = config.debug.moodboard;
  if (debugDir) {
    await mkdir(debugDir, { recursive: true });
    const debugId = await nextMoodboardDebugId(debugDir);
    const slug = meta.themeDescription
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 30);
    const filename = `${debugId}-${slug || "moodboard"}.png`;
    const filePath = join(debugDir, filename);
    await writeFile(filePath, buffer);
    const logPath = join(debugDir, "moodboard-log.txt");
    const line = `${new Date().toISOString()}\t${debugId}\ttheme="${meta.themeDescription}"\tartStyle="${meta.artStyle}"\tfile=${filename}\n`;
    await appendFile(logPath, line);
  }

  return buffer;
}

/** Next sequential 4-digit ID for moodboard debug (0001, 0002, …). */
async function nextMoodboardDebugId(debugDir: string): Promise<string> {
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
