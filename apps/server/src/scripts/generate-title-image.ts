#!/usr/bin/env npx tsx
import "dotenv/config";
import { writeFile } from "fs/promises";
import { generateTitleImage, writeTitleImageDebug } from "../lib/title-image.js";
import { config } from "../config.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-title-image -- --text "<title>" --visual-style "<style>" [options]

Options:
  --text <text>         Title text to render in the image (required)
  --visual-style <text> Style description for the image (required). Same as Creative Director titleImage.visualStyle.
  --output <path>       Output file path (default: ./title-image.png)

Examples:
  npm run generate-title-image -- --text "Happy Holidays" --visual-style "luxury, gold and black, elegant" --output holiday-title.png
  npm run generate-title-image -- --text "Win Big" --visual-style "bold typography, gold and dark" --output win-big.png
`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opts = parseNamedArgs(argv);

  const text = opts.text;
  const visualStyle = opts["visual-style"];
  if (!text) {
    console.error("Error: --text is required.");
    console.error(USAGE);
    process.exit(1);
  }
  if (!visualStyle) {
    console.error("Error: --visual-style is required.");
    console.error(USAGE);
    process.exit(1);
  }

  const params = {
    text,
    visualStyle,
  };
  const outputPath = opts.output ?? "./title-image.png";

  try {
    console.log("Generating title image...");
    const buffer = await generateTitleImage(params);
    await writeFile(outputPath, buffer);
    console.log("Saved to", outputPath);

    if (config.debug.titleImage) {
      await writeTitleImageDebug(buffer, params);
      console.log("Title image debug: wrote to", config.debug.titleImage);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
