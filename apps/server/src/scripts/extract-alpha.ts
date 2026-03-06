#!/usr/bin/env npx tsx
import { access } from "fs/promises";
import { constants } from "fs";
import { extractAlphaTwoPass } from "../lib/extractAlpha.js";

const USAGE = `
Usage: extract-alpha <white-image> <black-image> <output-path>

  white-image   Path to the image on white (#FFFFFF) background
  black-image   Path to the identical image on black (#000000) background
  output-path   Path for the output PNG with transparent background

Example:
  npm run extract-alpha -- white.png black.png output.png
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
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    console.error(USAGE);
    process.exit(1);
  }

  const [whitePath, blackPath, outputPath] = args;

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
