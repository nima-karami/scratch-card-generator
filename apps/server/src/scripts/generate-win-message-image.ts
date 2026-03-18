#!/usr/bin/env npx tsx
import "dotenv/config";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { generateWinMessageImage, writeWinMessageImageDebug } from "../lib/win-message-image.js";
import { config } from "../config/index.js";
import { parseNamedArgs } from "./cli-utils.js";

const DEFAULT_TEXT = "You Won!";

const USAGE = `
Usage: npm run generate-win-message-image -- --visual-style "<style>" [options]

Options:
  --text <text>                  Win message text to render (default: "${DEFAULT_TEXT}")
  --visual-style <text>          Style description for the win message (required)
  --output <path>                Output file path (default: ./win-message.png)
  --reference-image <path>      Optional: path to a moodboard/reference image to anchor visual style

Examples:
  npm run generate-win-message-image -- --visual-style "luxury typography, gold and black" --output ./output/win-message.png
  npm run generate-win-message-image -- --text "You Won!" --visual-style "bold typography, gold and dark" --output ./output/win-message.png
  npm run generate-win-message-image -- --visual-style "playful bakery" --output ./output/win-message.png --reference-image ./moodboard.png
`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opts = parseNamedArgs(argv);

  const visualStyle = opts["visual-style"];
  if (!visualStyle) {
    console.error("Error: --visual-style is required.");
    console.error(USAGE);
    process.exit(1);
  }

  const text = opts.text ?? DEFAULT_TEXT;
  let referenceImage: Buffer | undefined;
  const refPath = opts["reference-image"];
  if (refPath) {
    if (!existsSync(refPath)) {
      console.error(`Error: --reference-image file not found: ${refPath}`);
      process.exit(1);
    }
    referenceImage = await readFile(refPath);
  }

  const params = {
    text,
    visualStyle,
    ...(referenceImage && { referenceImage }),
  };
  const outputPath = opts.output ?? "./win-message.png";

  try {
    console.log("Generating win message image...");
    if (referenceImage) console.log("  Reference image:", refPath);
    const buffer = await generateWinMessageImage(params);
    await writeFile(outputPath, buffer);
    console.log("Saved to", outputPath);

    if (config.debug.winMessageImage) {
      await writeWinMessageImageDebug(buffer, params);
      console.log("Win message image debug: wrote to", config.debug.winMessageImage);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();

