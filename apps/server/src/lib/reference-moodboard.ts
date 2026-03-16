import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Path to the default reference moodboard (deconstructed collage; re-theme source for generated moodboards). */
const DEFAULT_REFERENCE_PATH = path.join(__dirname, "..", "..", "assets", "reference-moodboard.png");

/**
 * Returns the default reference moodboard image buffer, or undefined if the file is missing.
 * Used as the source image for moodboard generation when no override is provided.
 */
export async function getDefaultReferenceMoodboard(): Promise<Buffer | undefined> {
  try {
    return await readFile(DEFAULT_REFERENCE_PATH);
  } catch {
    return undefined;
  }
}
