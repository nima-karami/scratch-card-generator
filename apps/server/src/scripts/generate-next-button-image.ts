#!/usr/bin/env npx tsx
import "dotenv/config";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { generateNextButtonImage, writeNextButtonImageDebug } from "../lib/next-button-image.js";
import { config } from "../config/index.js";
import { parseNamedArgs } from "./cli-utils.js";

const DEFAULT_TEXT = "Next";

const USAGE = `
Usage: npm run generate-next-button-image -- --visual-style "<full button style>" [options]

Options:
  --text <text>                  Label on the button (default: "${DEFAULT_TEXT}")
  --visual-style <text>          CTA shape, chrome, colors, label typography (required)
  --output <path>                Output transparent PNG (default: ./next-button-image.png)
  --reference-image <path>       Optional moodboard to anchor Graphic Style, palette, typography

Examples:
  npm run generate-next-button-image -- --visual-style "rounded pill, gold rim, deep green fill, white Next text" --output ./output/next.png
  npm run generate-next-button-image -- --visual-style "glass chip with soft glow, centered Next" --reference-image ./moodboard.png
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

  const outputPath = opts.output ?? "./next-button-image.png";

  const params = {
    text,
    visualStyle,
    ...(referenceImage && { referenceImage }),
  };

  try {
    console.log("Generating next button (CTA) image...");
    if (referenceImage) console.log("  Reference image:", refPath);
    const buffer = await generateNextButtonImage(params);
    await writeFile(outputPath, buffer);
    console.log("Saved to", outputPath);

    if (config.debug.nextButtonImage) {
      await writeNextButtonImageDebug(buffer, params);
      console.log("Next button debug: wrote to", config.debug.nextButtonImage);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();

