#!/usr/bin/env npx tsx
import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { config } from "../config/index.js";
import { parseNamedArgs } from "./cli-utils.js";
import { runFullDirector } from "../lib/creative-director/generate-manifest.js";
import { writeThemeManifestDebug } from "../lib/creative-director/theme-manifest-debug.js";

const USAGE = `
Usage: npm run generate-theme-manifest -- --theme "<description>" --output <path>

Generates only the theme manifest (Creative Director output) and writes it to the given path.
Use this to review and edit the manifest before running generate-theme-assets.

Options:
  --theme <text>   Theme description (e.g. "cookies", "retro space arcade")
  --output <path>  Output path for manifest.json (required)

Example:
  npm run generate-theme-manifest -- --theme "cookies" --output ./output/cookies/manifest.json
  # Edit manifest.json, then:
  npm run generate-theme-assets -- --manifest ./output/cookies/manifest.json --output ./output/cookies
`;

async function main(): Promise<void> {
  const opts = parseNamedArgs();
  const theme = opts.theme;
  const output = opts.output;

  if (!theme || !output) {
    console.error("Error: --theme and --output are required.");
    console.error(USAGE);
    process.exit(1);
  }

  console.log("Creative Director: designing theme (meta → moodboard → elements)...");
  const { manifest } = await runFullDirector(theme);

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(manifest, null, 2), "utf-8");
  console.log("Wrote", output);

  if (config.debug.themeManifest) {
    await writeThemeManifestDebug(manifest, theme, output);
    console.log("Theme manifest debug: wrote to", config.debug.themeManifest);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
