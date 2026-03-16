#!/usr/bin/env npx tsx
import "dotenv/config";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { generateThemeMeta } from "../lib/creative-director/generate-manifest.js";
import { generateMoodboard } from "../lib/moodboard.js";
import { getDefaultReferenceMoodboard } from "../lib/reference-moodboard.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-moodboard -- --theme "<description>" [--output <path>] [--source-image <path>]

Generates a master moodboard image from the theme. Runs Phase 1 of the Creative Director
(meta: artStyle, colorPalette, mood) then generates the moodboard. With --source-image,
the given reference image (e.g. deconstructed moodboard collage) is re-themed with the meta to produce the moodboard.

Options:
  --theme <text>        Theme description (e.g. "cookies", "retro space arcade") (required)
  --output <path>       Output file path (default: ./moodboard.png)
  --source-image <path> Optional: path to a reference image to re-theme into the moodboard (overrides default apps/server/assets/reference-moodboard.png)

Examples:
  npm run generate-moodboard -- --theme "cookies" --output ./output/cookies/moodboard.png
  npm run generate-moodboard -- --theme "cookies" --source-image ./my-collage.png --output ./moodboard.png
`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opts = parseNamedArgs(argv);

  const theme = opts.theme;
  if (!theme) {
    console.error("Error: --theme is required.");
    console.error(USAGE);
    process.exit(1);
  }

  const outputPath = opts.output ?? "./moodboard.png";

  let sourceImage: Buffer | undefined;
  const sourcePath = opts["source-image"];
  if (sourcePath) {
    if (!existsSync(sourcePath)) {
      console.error(`Error: --source-image file not found: ${sourcePath}`);
      process.exit(1);
    }
    sourceImage = await readFile(sourcePath);
    console.log("Using source reference image:", sourcePath);
  } else {
    sourceImage = await getDefaultReferenceMoodboard();
    if (sourceImage) console.log("Using default reference moodboard (apps/server/assets/reference-moodboard.png)");
  }

  try {
    console.log("Phase 1: Generating art direction (meta)...");
    const meta = await generateThemeMeta(theme);
    console.log("  artStyle:", meta.artStyle);
    console.log("  mood:", meta.mood);
    console.log("  colorPalette:", meta.colorPalette.join(", "));

    console.log(sourceImage ? "Re-theming reference image into moodboard..." : "Generating moodboard image...");
    const buffer = await generateMoodboard(meta, sourceImage ? { sourceImage } : undefined);
    await writeFile(outputPath, buffer);
    console.log("Saved to", outputPath);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
