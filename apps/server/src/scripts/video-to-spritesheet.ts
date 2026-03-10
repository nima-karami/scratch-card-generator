#!/usr/bin/env npx tsx
import "dotenv/config";
import { writeFile } from "fs/promises";
import { generateSpritesheetFromVideo } from "../lib/spritesheet/generate-from-video.js";
import type { GenerateFromVideoParams } from "../lib/spritesheet/generate-from-video.js";
import { resolve } from "path";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run video-to-spritesheet -- --video <path> --cols <n> --rows <n> --width <px> --height <px> --output <path>

Options:
  --video <path>   Path to the input video file
  --cols <n>       Number of columns in the spritesheet
  --rows <n>       Number of rows in the spritesheet
  --width <px>     Canvas width in pixels per frame
  --height <px>    Canvas height in pixels per frame
  --output <path>  Output path for the transparent PNG

Example:
  npm run video-to-spritesheet -- --video ./input.mp4 --cols 4 --rows 3 --width 256 --height 256 --output ./output.png
`;

async function main(): Promise<void> {
  const opts = parseNamedArgs();
  const required = ["video", "cols", "rows", "width", "height", "output"] as const;
  const missing = required.filter((k) => !opts[k]);
  if (missing.length > 0) {
    console.error(`Error: Missing required options: ${missing.map((k) => `--${k}`).join(", ")}`);
    console.error(USAGE);
    process.exit(1);
  }

  const videoPath = resolve(opts.video!);
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

  const totalFrames = cols * rows;

  const params: GenerateFromVideoParams = {
    videoPath,
    cols,
    rows,
    canvasWidth: width,
    canvasHeight: height,
  };

  console.log("Generating spritesheet from video...");
  console.log(`  Source Video: ${params.videoPath}`);
  console.log(`  Grid: ${cols}x${rows} (${totalFrames} frames)`);
  console.log(`  Frame Size: ${width}x${height}px`);

  try {
    const result = await generateSpritesheetFromVideo(params);
    await writeFile(outputPath, result.transparent);
    console.log(`Success: wrote ${outputPath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

main();
