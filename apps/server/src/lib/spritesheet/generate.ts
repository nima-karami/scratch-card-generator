import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { extractAlphaTwoPass } from "../extractAlpha.js";
import { generateImage } from "../gemini.js";
import { swapBackground } from "./swap-background.js";
import { buildSpritesheetPrompt } from "./prompt-builder.js";
import type { SpritesheetPromptParams } from "./prompt-builder.js";

export interface GenerateSpritesheetResult {
  whiteBg: Buffer;
  blackBg: Buffer;
  transparent: Buffer;
}

/**
 * Orchestrates the full spritesheet generation pipeline:
 * 1. Build prompt and generate image on white background
 * 2. Swap background to black via Gemini edit
 * 3. Extract alpha from white + black to produce transparent PNG
 */
export async function generateSpritesheet(
  params: SpritesheetPromptParams
): Promise<GenerateSpritesheetResult> {
  const prompt = buildSpritesheetPrompt({ ...params, backgroundColor: "white" });
  const whiteBg = await generateImage(prompt);
  const blackBg = await swapBackground(whiteBg, "white", "black");

  const workDir = await mkdtemp(join(tmpdir(), `spritesheet-${randomUUID()}-`));
  const whitePath = join(workDir, "white.png");
  const blackPath = join(workDir, "black.png");
  const outputPath = join(workDir, "transparent.png");

  try {
    await writeFile(whitePath, whiteBg);
    await writeFile(blackPath, blackBg);
    await extractAlphaTwoPass(whitePath, blackPath, outputPath);
    const transparent = await readFile(outputPath);
    return { whiteBg, blackBg, transparent };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
