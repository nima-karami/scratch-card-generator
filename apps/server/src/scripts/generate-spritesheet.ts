#!/usr/bin/env npx tsx
import "dotenv/config";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { generateSpritesheet } from "../lib/spritesheet/generate.js";
import type { SpritesheetPromptParams } from "../lib/spritesheet/prompt-builder.js";
import { config } from "../config/index.js";
import { parseNamedArgs } from "./cli-utils.js";

const DEFAULT_VISUAL_STYLE = "2D flat illustration style";

const USAGE = `
Usage: npm run generate-spritesheet -- --subject "<subject>" --action "<action>" --cols <n> --rows <n> --width <px> --height <px> --output <path> [--visual-style <style>] [--reference-image <path>]

Options:
  --subject <text>       Subject of the animation (e.g. "chocolate chip cookie")
  --action <text>        Animation action (e.g. "crumbling")
  --cols <n>             Number of columns
  --rows <n>             Number of rows
  --width <px>           Canvas width in pixels
  --height <px>          Canvas height in pixels
  --output <path>        Output path for the transparent PNG
  --visual-style <text>  Art style for the spritesheet (e.g. "2D flat illustration style", "pixel art", "watercolor"). Default: "${DEFAULT_VISUAL_STYLE}"
  --reference-image <path> Optional: path to a moodboard/reference image to anchor visual style

Example:
  npm run generate-spritesheet -- --subject "Apple" --action "being eaten" --cols 4 --rows 3 --width 1024 --height 768 --output ./output.png
  npm run generate-spritesheet -- --subject "Dinosaur" --action "walking" --cols 4 --rows 2 --width 512 --height 256 --visual-style "pixel art, 16-bit game style" --output dino.png
  npm run generate-spritesheet -- --subject "cookie" --action "crumbling" --cols 4 --rows 3 --width 1024 --height 768 --output out.png --reference-image ./moodboard.png
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

  const params: SpritesheetPromptParams = {
    canvasWidth: width,
    canvasHeight: height,
    cols,
    rows,
    subject,
    animationAction: action,
    keyframes,
    visualStyle,
    backgroundColor: "white",
    ...(referenceImage && { referenceImage }),
  };

  console.log("Generating spritesheet...");
  console.log(`  Subject: ${subject} ${action}`);
  console.log(`  Visual style: ${visualStyle}`);
  console.log(`  Grid: ${cols}x${rows} (${totalFrames} frames)`);
  console.log(`  Size: ${width}x${height}px`);
  if (referenceImage) console.log("  Reference image:", refPath);
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
