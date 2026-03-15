#!/usr/bin/env npx tsx
import "dotenv/config";
import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { config } from "../config.js";
import { parseNamedArgs } from "./cli-utils.js";
import { runFullDirector } from "../lib/creative-director/generate-manifest.js";
import type { ThemeManifest } from "../lib/creative-director/types.js";

async function nextThemeManifestDebugId(debugDir: string): Promise<string> {
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

async function writeThemeManifestDebug(
  manifest: ThemeManifest,
  theme: string,
  outputPath: string,
): Promise<void> {
  const debugDir = config.debug.themeManifest;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const debugId = await nextThemeManifestDebugId(debugDir);
  const slug = themeSlug(theme);
  const filename = `${debugId}-${slug}-manifest.json`;
  await writeFile(
    join(debugDir, filename),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );
  const logPath = join(debugDir, "theme-manifest-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\ttheme="${theme}"\toutput=${outputPath}\tfile=${filename}\n`;
  await appendFile(logPath, line);
}

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
