#!/usr/bin/env npx tsx
import "dotenv/config";
import { writeFile } from "fs/promises";
import { generateParticleSpritesheet } from "../lib/spritesheet/generate.js";
import type { ParticleSpritesheetPromptParams } from "../lib/spritesheet/prompt-builder.js";
import { parseNamedArgs } from "./cli-utils.js";

const DEFAULT_VISUAL_STYLE = "2D flat illustration style";

const USAGE = `
Usage: npm run generate-particle-spritesheet -- --subject "<subject>" --cols <n> --rows <n> --width <px> --height <px> --output <path> [--visual-style <style>]

Options:
  --subject <text>       Subject for each cell (e.g. "small cookie crumb", "coin")
  --cols <n>            Number of columns
  --rows <n>            Number of rows
  --width <px>          Canvas width in pixels
  --height <px>         Canvas height in pixels
  --output <path>       Output path for the transparent PNG
  --visual-style <text> Art style. Default: "${DEFAULT_VISUAL_STYLE}"

Example:
  npm run generate-particle-spritesheet -- --subject "small chocolate chip cookie crumb" --cols 4 --rows 2 --width 512 --height 256 --output ./particles-cookie.png
`;

const REQUIRED = ["subject", "cols", "rows", "width", "height", "output"] as const;

async function main(): Promise<void> {
  const opts = parseNamedArgs();
  const missing = REQUIRED.filter((k) => !opts[k]);
  if (missing.length > 0) {
    console.error(
      `Error: Missing required options: ${missing.map((k) => `--${k}`).join(", ")}`
    );
    console.error(USAGE);
    process.exit(1);
  }

  const subject = opts.subject!;
  const outputPath = opts.output!;
  const cols = parseInt(opts.cols!, 10);
  const rows = parseInt(opts.rows!, 10);
  const width = parseInt(opts.width!, 10);
  const height = parseInt(opts.height!, 10);

  if ([cols, rows, width, height].some((n) => isNaN(n))) {
    console.error("Error: --cols, --rows, --width, and --height must be numbers.");
    console.error(USAGE);
    process.exit(1);
  }

  const visualStyle = opts["visual-style"] ?? DEFAULT_VISUAL_STYLE;

  const params: ParticleSpritesheetPromptParams = {
    canvasWidth: width,
    canvasHeight: height,
    cols,
    rows,
    subject,
    visualStyle,
    backgroundColor: "white",
  };

  console.log("Generating particle spritesheet...");
  console.log(`  Subject: ${subject} (${cols}x${rows} variants)`);
  console.log(`  Visual style: ${visualStyle}`);
  console.log(`  Size: ${width}x${height}px`);

  try {
    const result = await generateParticleSpritesheet(params);
    await writeFile(outputPath, result.transparent);
    console.log(`Success: wrote ${outputPath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

main();
