#!/usr/bin/env npx tsx
import "dotenv/config";
import { writeFile } from "fs/promises";
import { config } from "../config.js";
import {
  generateContainerImage,
  writeContainerImageDebug,
  type GenerateContainerImageParams,
  type ContainerImageType,
} from "../lib/container-image.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-container-image -- --type <solid|gradient|pattern> [options]

Generates a subtle background image for game containers. Solid is procedural (no API key).
Gradient and pattern use Gemini (require GEMINI_API_KEY) for high-quality results.

Options:
  --type <type>         One of: solid, gradient, pattern (required)
  --width <px>          Width in pixels. Default: 400
  --height <px>         Height in pixels. Default: 300
  --color <hex>         Primary color (e.g. #1a1a2e). Default: #1a1a2e
  --color-end <hex>     End color for gradient. Default: #16213e
  --angle <degrees>     Gradient angle (linear). Default: 135
  --pattern <name>      For type=pattern: dots, lines, or grid. Default: dots
  --pattern-scale <px>  Tile size for pattern (legacy). Default: 24
  --visual-style <text> Style for LLM (gradient/pattern). Same as Creative Director containerBackground.visualStyle.
  --output <path>       Output file path. Default: ./container-image.png

Examples:
  npm run generate-container-image -- --type solid --color "#2d1b4e" --output bg.png
  npm run generate-container-image -- --type gradient --color "#1a1a2e" --color-end "#0f3460" --visual-style "luxury, elegant"
  npm run generate-container-image -- --type pattern --pattern dots --visual-style "minimal, subtle" --output pattern.png
`;

function parseType(s: string): ContainerImageType {
  if (s === "solid" || s === "gradient" || s === "pattern") return s;
  throw new Error(`Invalid type: ${s}. Use solid, gradient, or pattern.`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opts = parseNamedArgs(argv);

  const typeRaw = opts.type;
  if (!typeRaw) {
    console.error("Error: --type is required.");
    console.error(USAGE);
    process.exit(1);
  }

  let type: ContainerImageType;
  try {
    type = parseType(typeRaw);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const params: GenerateContainerImageParams = {
    type,
    width: opts.width ? parseInt(opts.width, 10) : undefined,
    height: opts.height ? parseInt(opts.height, 10) : undefined,
    color: opts.color,
    colorEnd: opts["color-end"],
    angle: opts.angle ? parseInt(opts.angle, 10) : undefined,
    pattern: opts.pattern as GenerateContainerImageParams["pattern"],
    patternScale: opts["pattern-scale"] ? parseInt(opts["pattern-scale"], 10) : undefined,
    visualStyle: opts["visual-style"],
  };

  const outputPath = opts.output ?? "./container-image.png";

  try {
    console.log("Generating container image...");
    const buffer = await generateContainerImage(params);
    await writeFile(outputPath, buffer);
    console.log("Saved to", outputPath);

    await writeContainerImageDebug(buffer, params);
    if (config.debug.containerImage) {
      console.log("Debug: wrote to", config.debug.containerImage);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
