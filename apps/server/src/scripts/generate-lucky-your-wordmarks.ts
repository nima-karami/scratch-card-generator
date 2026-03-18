#!/usr/bin/env npx tsx
import "dotenv/config";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join, resolve } from "path";
import { generateTwoWordmarkImages, writeTitleImageDebug } from "../lib/title-image.js";
import { config } from "../config/index.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-lucky-your-wordmarks -- --visual-style "<style>" --output-dir "<dir>" [options]

Options:
  --visual-style <text>      Visual style/typography description (required). Same as Creative Director output.
  --output-dir <dir>        Output directory to write:
                             - lucky-numbers-header.png
                             - your-numbers-header.png
  --reference-image <path>   Optional: moodboard/reference image to anchor typography style.

Examples:
  npm run generate-lucky-your-wordmarks -- --visual-style "luxury typography, gold and black" --output-dir ./output/wordmarks
  npm run generate-lucky-your-wordmarks -- --visual-style "bold typography, gold and dark" --output-dir ./output/wordmarks --reference-image ./moodboard.png
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

  const outputDir = opts["output-dir"];
  if (!outputDir) {
    console.error("Error: --output-dir is required.");
    console.error(USAGE);
    process.exit(1);
  }

  const refPath = opts["reference-image"];
  let referenceImage: Buffer | undefined;
  if (refPath) {
    if (!existsSync(refPath)) {
      console.error(`Error: --reference-image file not found: ${refPath}`);
      process.exit(1);
    }
    referenceImage = await readFile(refPath);
  }

  const absoluteOutDir = resolve(outputDir);
  await mkdir(absoluteOutDir, { recursive: true });

  try {
    console.log("Generating Lucky Numbers + Your Numbers wordmarks...");
    const { top, bottom } = await generateTwoWordmarkImages({
      topText: "Lucky Numbers",
      bottomText: "Your Numbers",
      visualStyle,
      ...(referenceImage && { referenceImage }),
    });

    const luckyPath = join(absoluteOutDir, "lucky-numbers-header.png");
    const yourPath = join(absoluteOutDir, "your-numbers-header.png");
    await writeFile(luckyPath, top);
    await writeFile(yourPath, bottom);

    console.log("Saved:");
    console.log(" ", luckyPath);
    console.log(" ", yourPath);

    if (config.debug.titleImage) {
      // Reuse title-image debug writer so you can inspect single-call typography outputs.
      await writeTitleImageDebug(top, { text: "Lucky Numbers", visualStyle });
      await writeTitleImageDebug(bottom, { text: "Your Numbers", visualStyle });
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();

