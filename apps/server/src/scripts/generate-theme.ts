#!/usr/bin/env npx tsx
import "dotenv/config";
import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../config.js";
import { parseNamedArgs } from "./cli-utils.js";
import { runFullDirector } from "../lib/creative-director/generate-manifest.js";
import { orchestrateThemeAssets } from "../lib/creative-director/orchestrate.js";
import { PIPELINE_CONFIG } from "../lib/creative-director/pipeline-config.js";
import type { ThemeManifest } from "../lib/creative-director/types.js";

async function nextThemeDebugId(debugDir: string): Promise<string> {
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

function themeSlug(theme: string, maxLen = 30): string {
  return theme
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, maxLen) || "theme";
}

async function writeThemeDebug(
  manifest: ThemeManifest,
  theme: string,
  outputDir: string,
  result: Awaited<ReturnType<typeof orchestrateThemeAssets>>,
): Promise<void> {
  const debugDir = config.debug.theme;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const debugId = await nextThemeDebugId(debugDir);
  const slug = themeSlug(theme);
  const manifestFilename = `${debugId}-${slug}-manifest.json`;
  await writeFile(
    join(debugDir, manifestFilename),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );
  const logPath = join(debugDir, "theme-log.txt");
  const assetList = [
    ...result.gameButtonSpritesheets,
    result.particleSpritesheet,
    result.titleImage,
    result.containerBackground,
    result.videoBackground,
    result.backgroundMusic,
    result.revealSound,
    result.glyphSheet,
  ]
    .filter(Boolean)
    .join(", ");
  const line = `${new Date().toISOString()}\t${debugId}\ttheme="${theme}"\toutput=${outputDir}\tmanifest=${manifestFilename}\tassets=${assetList}\n`;
  await appendFile(logPath, line);
}

const USAGE = `
Usage: npm run generate-theme -- --theme "<description>" --output <dir>

Generates a full theme: Creative Director produces a manifest, then all enabled assets
are generated into the output directory. Also writes manifest.json there for reference.

Options:
  --theme <text>   Theme description (e.g. "cookies", "retro space arcade")
  --output <dir>   Output directory for manifest and all assets (required)

Example:
  npm run generate-theme -- --theme "cookies" --output ./output/cookies
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
  const { manifest, moodboard } = await runFullDirector(theme);

  await mkdir(output, { recursive: true });
  const manifestPath = join(output, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log("Wrote", manifestPath);

  console.log("Generating assets (anchored to moodboard)...");
  const result = await orchestrateThemeAssets(
    manifest,
    PIPELINE_CONFIG,
    output,
    (ev) => {
      if (ev.message) console.log(" ", ev.type + ":", ev.message);
    },
    { moodboard }
  );

  console.log("Done. Assets:");
  if (result.gameButtonSpritesheets.length) {
    result.gameButtonSpritesheets.forEach((p) => console.log(" ", p));
  }
  if (result.particleSpritesheet) console.log(" ", result.particleSpritesheet);
  if (result.titleImage) console.log(" ", result.titleImage);
  if (result.containerBackground) console.log(" ", result.containerBackground);
  if (result.videoBackground) console.log(" ", result.videoBackground);
  if (result.backgroundMusic) console.log(" ", result.backgroundMusic);
  if (result.revealSound) console.log(" ", result.revealSound);
  if (result.glyphSheet) console.log(" ", result.glyphSheet);
  if (result.winOverlay) console.log(" ", "winOverlay (config)");

  if (config.debug.theme) {
    await writeThemeDebug(manifest, theme, output, result);
    console.log("Theme debug: wrote to", config.debug.theme);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
