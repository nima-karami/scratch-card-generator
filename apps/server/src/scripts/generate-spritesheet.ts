#!/usr/bin/env npx tsx
import "dotenv/config";
import { writeFile } from "fs/promises";
import { generateSpritesheet } from "../lib/spritesheet/generate.js";
import type { SpritesheetPromptParams } from "../lib/spritesheet/prompt-builder.js";
import { config } from "../config.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-spritesheet -- --subject "<subject>" --action "<action>" --cols <n> --rows <n> --width <px> --height <px> --output <path>

Options:
  --subject <text>   Subject of the animation (e.g. "chocolate chip cookie")
  --action <text>   Animation action (e.g. "crumbling")
  --cols <n>        Number of columns
  --rows <n>        Number of rows
  --width <px>      Canvas width in pixels
  --height <px>     Canvas height in pixels
  --output <path>   Output path for the transparent PNG

Example:
  npm run generate-spritesheet -- --subject "Apple" --action "being eaten" --cols 4 --rows 3 --width 1024 --height 768 --output ./output.png
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

const REQUIRED = ["subject", "action", "cols", "rows", "width", "height", "output"] as const;

async function main(): Promise<void> {
  const opts = parseNamedArgs();
  const missing = REQUIRED.filter((k) => !opts[k]);
  if (missing.length > 0) {
    console.error(`Error: Missing required options: ${missing.map((k) => `--${k}`).join(", ")}`);
    console.error(USAGE);
    process.exit(1);
  }

  const subject = opts.subject!;
  const action = opts.action!;
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
  console.log(`  QA Config: Algorithmic=${config.spritesheet.qa.algorithmicEnabled}, LLM=${config.spritesheet.qa.llmEnabled}, MaxRetries=${config.spritesheet.qa.maxRetries}`);

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
