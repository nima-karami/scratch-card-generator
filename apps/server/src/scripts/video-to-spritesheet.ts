#!/usr/bin/env npx tsx
import "dotenv/config";
import { writeFile } from "fs/promises";
import { generateSpritesheetFromVideo } from "../lib/spritesheet/generate-from-video.js";
import type { GenerateFromVideoParams } from "../lib/spritesheet/generate-from-video.js";
import { resolve } from "path";

const USAGE = `
Usage: video-to-spritesheet <videoPath> <cols> <rows> <width> <height> <output>

  videoPath The path to the input video file
  cols      Number of columns in the spritesheet
  rows      Number of rows in the spritesheet
  width     Canvas width in pixels per frame
  height    Canvas height in pixels per frame
  output    Output path for the transparent PNG

Example:
  npm run video-to-spritesheet -- ./input.mp4 4 3 256 256 ./output.png
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 6) {
    console.error(USAGE);
    process.exit(1);
  }

  const [videoPath, colsStr, rowsStr, widthStr, heightStr, outputPath] = args;

  const cols = parseInt(colsStr, 10);
  const rows = parseInt(rowsStr, 10);
  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);

  if ([cols, rows, width, height].some((n) => isNaN(n))) {
    console.error("Error: cols, rows, width, and height must be numbers.");
    console.error(USAGE);
    process.exit(1);
  }

  const totalFrames = cols * rows;

  const params: GenerateFromVideoParams = {
    videoPath: resolve(videoPath),
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
