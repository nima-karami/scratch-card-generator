#!/usr/bin/env npx tsx
import "dotenv/config";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { generateParticleSpritesheet } from "../lib/spritesheet/generate.js";
import type { ParticleSpritesheetPromptParams } from "../lib/spritesheet/prompt-builder.js";
import { parseNamedArgs } from "./cli-utils.js";

const DEFAULT_VISUAL_STYLE = "2D flat illustration style";

const USAGE = `
Usage: npm run generate-particle-spritesheet -- --subject "<subject>" --cols <n> --rows <n> --width <px> --height <px> --output <path> [--visual-style <style>] [--reference-image <path>]

Options:
  --subject <text>       Subject for each cell (e.g. "small cookie crumb", "coin")
  --cols <n>            Number of columns
  --rows <n>            Number of rows
  --width <px>          Canvas width in pixels
  --height <px>         Canvas height in pixels
  --output <path>       Output path for the transparent PNG
  --visual-style <text> Art style. Default: "${DEFAULT_VISUAL_STYLE}"
  --reference-image <path> Optional: path to a moodboard/reference image to anchor visual style

Example:
  npm run generate-particle-spritesheet -- --subject "small chocolate chip cookie crumb" --cols 4 --rows 2 --width 512 --height 256 --output ./particles-cookie.png
  npm run generate-particle-spritesheet -- --subject "gold star" --cols 4 --rows 2 --width 512 --height 256 --output particles.png --reference-image ./moodboard.png
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

  let referenceImage: Buffer | undefined;
  const refPath = opts["reference-image"];
  if (refPath) {
    if (!existsSync(refPath)) {
      console.error(`Error: --reference-image file not found: ${refPath}`);
      process.exit(1);
    }
    referenceImage = await readFile(refPath);
  }

  const params: ParticleSpritesheetPromptParams = {
    canvasWidth: width,
    canvasHeight: height,
    cols,
    rows,
    subject,
    visualStyle,
    backgroundColor: "white",
    ...(referenceImage && { referenceImage }),
  };

  console.log("Generating particle spritesheet...");
  console.log(`  Subject: ${subject} (${cols}x${rows} variants)`);
  console.log(`  Visual style: ${visualStyle}`);
  if (referenceImage) console.log("  Reference image:", refPath);
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
