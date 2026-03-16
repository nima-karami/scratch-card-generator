#!/usr/bin/env npx tsx
import "dotenv/config";
import { appendFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { config } from "../config/index.js";
import { parseNamedArgs } from "./cli-utils.js";
import { orchestrateThemeAssets } from "../lib/creative-director/orchestrate.js";
import { PIPELINE_CONFIG } from "../lib/creative-director/pipeline-config.js";
import { themeManifestSchema } from "../lib/creative-director/types.js";

async function writeThemeAssetsDebug(
  manifestPath: string,
  outputDir: string,
  result: Awaited<ReturnType<typeof orchestrateThemeAssets>>,
): Promise<void> {
  const debugDir = config.debug.themeAssets;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const assetList = [
    ...result.gameButtonSpritesheets,
    result.particleSpritesheet,
    result.titleImage,
    result.containerBackground,
    result.backgroundImage,
    result.videoBackground,
    result.backgroundMusic,
    result.revealSound,
    result.glyphSheet,
  ]
    .filter(Boolean)
    .join(", ");
  const logPath = join(debugDir, "theme-assets-log.txt");
  const line = `${new Date().toISOString()}\tmanifest=${manifestPath}\toutput=${outputDir}\tassets=${assetList}\n`;
  await appendFile(logPath, line);
}

const USAGE = `
Usage: npm run generate-theme-assets -- --manifest <path> --output <dir>

Reads an existing theme manifest and generates all enabled assets into the output directory.
Use after editing a manifest produced by generate-theme-manifest.

Options:
  --manifest <path>  Path to manifest.json (required)
  --output <dir>     Output directory for assets (required)

Example:
  npm run generate-theme-assets -- --manifest ./output/cookies/manifest.json --output ./output/cookies
`;

async function main(): Promise<void> {
  const opts = parseNamedArgs();
  const manifestPath = opts.manifest;
  const output = opts.output;

  if (!manifestPath || !output) {
    console.error("Error: --manifest and --output are required.");
    console.error(USAGE);
    process.exit(1);
  }

  const raw = await readFile(manifestPath, "utf-8");
  const parsed = themeManifestSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error("Invalid manifest:", parsed.error.flatten());
    process.exit(1);
  }
  const manifest = parsed.data;

  console.log("Generating assets from manifest...");
  const result = await orchestrateThemeAssets(
    manifest,
    PIPELINE_CONFIG,
    output,
    (ev) => {
      if (ev.message) console.log(" ", ev.type + ":", ev.message);
    }
  );

  console.log("Done. Assets:");
  if (result.gameButtonSpritesheets.length) {
    result.gameButtonSpritesheets.forEach((p) => console.log(" ", p));
  }
  if (result.particleSpritesheet) console.log(" ", result.particleSpritesheet);
  if (result.titleImage) console.log(" ", result.titleImage);
  if (result.containerBackground) console.log(" ", result.containerBackground);
  if (result.backgroundImage) console.log(" ", result.backgroundImage);
  if (result.videoBackground) console.log(" ", result.videoBackground);
  if (result.backgroundMusic) console.log(" ", result.backgroundMusic);
  if (result.revealSound) console.log(" ", result.revealSound);
  if (result.glyphSheet) console.log(" ", result.glyphSheet);
  if (result.winOverlay) console.log(" ", "winOverlay (config)");

  if (config.debug.themeAssets) {
    await writeThemeAssetsDebug(manifestPath, output, result);
    console.log("Theme assets debug: wrote to", config.debug.themeAssets);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
