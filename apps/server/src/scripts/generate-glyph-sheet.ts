#!/usr/bin/env npx tsx
import "dotenv/config";
import { readFile, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { generateGlyphSheet } from "../lib/glyph-sheet/generate.js";
import { config } from "../config.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-glyph-sheet -- --input <path> --theme "<theme>" --output <path> [options]

Options:
  --input <path>   Path to the predefined glyph sheet image (12 glyphs: $ , 0-9 on solid background)
  --theme <text>   Theme for stylization (e.g. "cookie theme: warm browns, cream, chocolate chip")
  --output <path>  Output path for the transparent PNG (required)
  --cols <n>       Number of columns in the grid. Default: 12
  --rows <n>       Number of rows in the grid. Default: 1
  --slice          Also write 12 per-glyph PNGs (output-00.png … output-11.png, same directory as --output)

Example:
  npm run generate-glyph-sheet -- --input ./base-font.png --theme "cookie theme, warm browns" --output ./glyph-cookies.png
  npm run generate-glyph-sheet -- --input ./base-font.png --theme "dinosaur theme" --output ./out.png --slice
`;

const DEFAULT_COLS = 12;
const DEFAULT_ROWS = 1;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opts = parseNamedArgs(argv);
  const inputPath = opts.input;
  const theme = opts.theme;
  const outputPath = opts.output;
  const slice = argv.includes("--slice");

  if (!inputPath || !theme || !outputPath) {
    console.error("Error: --input, --theme, and --output are required.");
    console.error(USAGE);
    process.exit(1);
  }

  const cols = opts.cols ? parseInt(opts.cols, 10) : DEFAULT_COLS;
  const rows = opts.rows ? parseInt(opts.rows, 10) : DEFAULT_ROWS;
  if (isNaN(cols) || isNaN(rows) || cols * rows < 12) {
    console.error("Error: --cols and --rows must be numbers and cols*rows >= 12.");
    console.error(USAGE);
    process.exit(1);
  }

  try {
    const baseImageBuffer = await readFile(inputPath);
    console.log("Generating glyph sheet...");
    console.log(`  Input: ${inputPath}`);
    console.log(`  Theme: ${theme}`);
    console.log(`  Grid: ${cols}x${rows}`);
    console.log(`  Output: ${outputPath}`);
    if (slice) console.log("  Slice: writing 12 per-glyph PNGs");

    const result = await generateGlyphSheet(
      { baseImageBuffer, theme, cols, rows },
      { slice, inputPath },
    );

    await writeFile(outputPath, result.transparent);
    console.log(`Success: wrote ${outputPath}`);

    if (slice && result.slices?.length) {
      const dir = dirname(outputPath);
      const baseName = basename(outputPath, ".png") || "glyph";
      for (let i = 0; i < result.slices.length; i++) {
        const slicePath = join(dir, `${baseName}-${String(i).padStart(2, "0")}.png`);
        await writeFile(slicePath, result.slices[i]!);
        console.log(`  Wrote ${slicePath}`);
      }
    }

    if (config.debug.glyphSheet) {
      console.log("Glyph sheet debug: wrote to", config.debug.glyphSheet);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error:", msg);
    if (config.debug.glyphSheet) {
      try {
        const { appendFile, mkdir } = await import("fs/promises");
        const { join } = await import("path");
        await mkdir(config.debug.glyphSheet!, { recursive: true });
        await appendFile(
          join(config.debug.glyphSheet!, "glyph-sheet-log.txt"),
          `${new Date().toISOString()}\ttheme="${theme}"\tinput=${inputPath}\tsuccess=false\terror=${msg}\n`,
        );
      } catch {
        // ignore log failure
      }
    }
    process.exit(1);
  }
}

main();
