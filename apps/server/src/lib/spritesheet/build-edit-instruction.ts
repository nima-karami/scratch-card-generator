import { GoogleGenAI } from "@google/genai";
import { config } from "../../config/index.js";
import type { SpritesheetPromptParams } from "./prompt-builder.js";

const INSTRUCTION_MODEL = "gemini-3.1-pro-preview";

/**
 * Calls an LLM to turn QA issues into a detailed edit instruction for the image model.
 * Translates frame numbers to grid positions (row, column) so the image model knows where to fix.
 */
export async function buildDetailedEditInstruction(
  issues: string[],
  params: SpritesheetPromptParams
): Promise<string> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    return fallbackInstruction(issues, params);
  }

  const { cols, rows, subject, animationAction } = params;

  const prompt = `You are writing an instruction for an image-editing model that will fix a spritesheet. The model does NOT understand "frame 7" or "frame N". It only understands positions in a grid.

**Grid layout:** The spritesheet has ${cols} COLUMNS and ${rows} ROWS. Frames are ordered left-to-right, then top-to-bottom. So:
- Frame 1 = row 1, column 1 (top-left cell)
- Frame ${cols} = row 1, column ${cols} (top-right cell)
- Frame ${cols + 1} = row 2, column 1 (second row, first column)
- In general: frame N is in row ceil(N/${cols}), column ((N-1) mod ${cols}) + 1 (1-based).

**Subject:** ${subject} — ${animationAction}

**QA reported these issues:**
${issues.map((i) => `- ${i}`).join("\n")}

**Your task:** Rewrite this into ONE clear instruction (2–4 short paragraphs) for the image-editing model. For every mention of a frame number, say instead "the cell in row X, column Y (Nth row, Mth column from the left)" so the model knows exactly which cell to change. Be specific about WHAT to fix and HOW (e.g. match the style of the previous cell, remove the stray element, make the transition smoother). Do not repeat the grid rules; just output the instruction. Start directly with "Edit this spritesheet image so that:" or similar.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: INSTRUCTION_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = response.text?.trim();
    if (text) return text;
  } catch (err) {
    console.warn("Build edit instruction LLM error:", err);
  }

  return fallbackInstruction(issues, params);
}

function fallbackInstruction(
  issues: string[],
  params: SpritesheetPromptParams
): string {
  const { cols, rows, subject, animationAction } = params;
  return `This image is a spritesheet (${cols} columns × ${rows} rows) of: ${subject} ${animationAction}. Frames are laid out left-to-right, then top-to-bottom; frame N is in row ceil(N/${cols}), column ((N-1) mod ${cols}) + 1 (1-based).

Fix the following issues while keeping the same subject, art style, grid layout, and white background. When an issue refers to "frame K", fix the cell at that position in the grid:
${issues.map((i) => `- ${i}`).join("\n")}

Return only the corrected spritesheet image; do not change size or frame count.`;
}
