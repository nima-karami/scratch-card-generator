#!/usr/bin/env npx tsx
import "dotenv/config";
import { writeFile } from "fs/promises";
import { generateSpritesheet } from "../lib/spritesheet/generate.js";
import type { SpritesheetPromptParams } from "../lib/spritesheet/prompt-builder.js";

const USAGE = `
Usage: generate-spritesheet <subject> <action> <cols> <rows> <width> <height> <output>

  subject   Subject of the animation (e.g. "chocolate chip cookie")
  action    Animation action (e.g. "crumbling")
  cols      Number of columns
  rows      Number of rows
  width     Canvas width in pixels
  height    Canvas height in pixels
  output    Output path for the transparent PNG

Example:
  npm run generate-spritesheet -- "Apple" "being eaten" 4 3 1024 768 ./output.png
`;

function defaultKeyframes(
  totalFrames: number,
  subject: string,
  action: string
): { frame: number; description: string }[] {
  const mid = Math.ceil(totalFrames / 2);
  return [
    { frame: 1, description: `Fully intact, whole ${subject}, centered` },
    {
      frame: mid,
      description: `Roughly half-complete — ${action} in progress`,
    },
    {
      frame: totalFrames,
      description: `Completely done — pure empty background, nothing remains`,
    },
  ];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 7) {
    console.error(USAGE);
    process.exit(1);
  }

  const [subject, action, colsStr, rowsStr, widthStr, heightStr, outputPath] =
    args;

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
  const keyframes = defaultKeyframes(totalFrames, subject, action);

  const params: SpritesheetPromptParams = {
    canvasWidth: width,
    canvasHeight: height,
    cols,
    rows,
    subject,
    animationAction: action,
    keyframes,
    visualStyle: "2D flat illustration style",
    backgroundColor: "white",
  };

  console.log("Generating spritesheet...");
  console.log(`  Subject: ${subject} ${action}`);
  console.log(`  Grid: ${cols}x${rows} (${totalFrames} frames)`);
  console.log(`  Size: ${width}x${height}px`);

  try {
    const result = await generateSpritesheet(params);
    await writeFile(outputPath, result.transparent);
    console.log(`Success: wrote ${outputPath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

main();
