#!/usr/bin/env npx tsx
import "dotenv/config";
import { writeFile } from "fs/promises";
import { generateTitleImage, writeTitleImageDebug } from "../lib/title-image.js";
import { config } from "../config.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-title-image -- --text "<title>" [options]

Options:
  --text <text>     Title text to render in the image (required)
  --prompt <text>   Extra style or description for the image
  --theme <text>    Theme keyword (e.g. luxury, playful). Default: elegant
  --colors <text>  Color palette (e.g. gold and black). Default: gold and dark
  --output <path>  Output file path (default: ./title-image.png)

Examples:
  npm run generate-title-image -- --text "Happy Holidays" --theme luxury --output holiday-title.png
  npm run generate-title-image -- --text "Win Big" --colors "gold and black" --prompt "bold typography"
`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opts = parseNamedArgs(argv);

  const text = opts.text;
  if (!text) {
    console.error("Error: --text is required.");
    console.error(USAGE);
    process.exit(1);
  }

  const params = {
    text,
    prompt: opts.prompt,
    theme: opts.theme,
    colors: opts.colors,
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
