import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../config/index.js";
import { generateImage } from "./gemini.js";
import type { ThemeManifestMeta } from "./creative-director/types.js";

export interface GenerateMoodboardOptions {
  /** When set, this reference image (e.g. deconstructed moodboard collage) is re-themed with the meta to produce the moodboard. */
  sourceImage?: Buffer;
}

/**
 * Builds a text prompt for re-theming a deconstructed moodboard collage into a new theme.
 * The attached image is a deconstructed style reference (moodboard collage); output is a new collage.
 */
function buildRethemeMoodboardPrompt(meta: ThemeManifestMeta): string {
  const colors = meta.colorPalette.join(", ");
  const parts = [
    "The attached image is a deconstructed style reference (a moodboard collage with title, items, and background separated). Re-theme it according to the following.",
    `Theme: ${meta.themeDescription}.`,
    `Art style: ${meta.artStyle}.`,
    `Mood: ${meta.mood}.`,
    `Color palette (hex): ${colors}.`,
    "Output a new deconstructed collage with the same arrangement of separated elements (title sample, sample objects/icons, background or texture area), but applying the new theme's visuals, colors, and style. The output will be used as a style reference for generating other assets in the exact same style. Do not copy the original image; produce a new image that embodies the new theme. DO NOT generate a full scratch card layout — keep elements separate and clearly distinct, not layered as a single game card.",
  ];
  return parts.join(" ");
}

/**
 * Builds a text prompt for a single moodboard collage image derived from the theme meta (no source image).
 * The collage should include sample title treatment, sample objects, and textures so that
 * subsequent asset generations can use this image as a style anchor.
 */
function buildMoodboardPrompt(meta: ThemeManifestMeta): string {
  const colors = meta.colorPalette.join(", ");
  const parts = [
    "Generate a single moodboard image that will be used as the visual style reference for a scratch card game.",
    `Theme: ${meta.themeDescription}.`,
    `Art style: ${meta.artStyle}.`,
    `Mood: ${meta.mood}.`,
    `Use only these colors (hex): ${colors}.`,
    "The moodboard must be a collage that includes: (1) a sample title or headline treatment in the same style, (2) one or two sample objects or icons that could appear in the game with this theme (e.g. cookies, gems, gifts), (3) a small area showing background or texture (e.g. gradient, pattern, or scene snippet).",
    "Arrange these elements on a single image so the overall style is clear and consistent. No text labels or captions. The image will be used as a reference for generating other assets in the exact same style.",
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
  options?: GenerateMoodboardOptions
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
