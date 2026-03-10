#!/usr/bin/env npx tsx
import { access } from "fs/promises";
import { constants } from "fs";
import { extractAlphaTwoPass } from "../lib/extractAlpha.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run extract-alpha -- --white <path> --black <path> --output <path>

Options:
  --white <path>   Path to the image on white (#FFFFFF) background
  --black <path>   Path to the identical image on black (#000000) background
  --output <path>  Path for the output PNG with transparent background

Example:
  npm run extract-alpha -- --white white.png --black black.png --output output.png
`;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const opts = parseNamedArgs();
  const whitePath = opts.white;
  const blackPath = opts.black;
  const outputPath = opts.output;

  if (!whitePath || !blackPath || !outputPath) {
    console.error("Error: --white, --black, and --output are required.");
    console.error(USAGE);
    process.exit(1);
  }

  if (!(await fileExists(whitePath))) {
    console.error(`Error: File not found: ${whitePath}`);
    process.exit(1);
  }

  if (!(await fileExists(blackPath))) {
    console.error(`Error: File not found: ${blackPath}`);
    process.exit(1);
  }

  try {
    await extractAlphaTwoPass(whitePath, blackPath, outputPath);
    console.log(`Success: wrote ${outputPath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

main();
