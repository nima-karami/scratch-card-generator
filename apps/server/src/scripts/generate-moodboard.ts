#!/usr/bin/env npx tsx
import "dotenv/config";
import { writeFile } from "fs/promises";
import { generateThemeMeta } from "../lib/creative-director/generate-manifest.js";
import { generateMoodboard } from "../lib/moodboard.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-moodboard -- --theme "<description>" [--output <path>]

Generates a master moodboard image from the theme. Runs Phase 1 of the Creative Director
(meta: artStyle, colorPalette, mood) then generates a single collage image that anchors
visual style for all other assets.

Options:
  --theme <text>   Theme description (e.g. "cookies", "retro space arcade") (required)
  --output <path>  Output file path (default: ./moodboard.png)

Example:
  npm run generate-moodboard -- --theme "cookies" --output ./output/cookies/moodboard.png
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

  try {
    console.log("Phase 1: Generating art direction (meta)...");
    const meta = await generateThemeMeta(theme);
    console.log("  artStyle:", meta.artStyle);
    console.log("  mood:", meta.mood);
    console.log("  colorPalette:", meta.colorPalette.join(", "));

    console.log("Generating moodboard image...");
    const buffer = await generateMoodboard(meta);
    await writeFile(outputPath, buffer);
    console.log("Saved to", outputPath);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
