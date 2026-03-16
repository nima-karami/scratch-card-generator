import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { config } from "../../config/index.js";
import type { SpritesheetPromptParams } from "./prompt-builder.js";

export interface QAResult {
  passed: boolean;
  reason?: string;
  /** Accuracy/confidence score 0–1 from LLM QA (only set when LLM ran) */
  confidence?: number;
  /** Raw issues from LLM QA (when failed); used to build detailed edit instructions with grid positions */
  issues?: string[];
  /** Ready-to-use instruction for the image-editing model (when failed); has full context and grid positions */
  editInstructions?: string;
}

export async function validateAlgorithmically(
  imageBuffer: Buffer,
  params: SpritesheetPromptParams,
): Promise<QAResult> {
  const { cols, rows, canvasWidth, canvasHeight } = params;
  const frameWidth = Math.floor(canvasWidth / cols);
  const frameHeight = Math.floor(canvasHeight / rows);

  const image = sharp(imageBuffer);

  const lastRow = rows - 1;
  const lastCol = cols - 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isFirst = r === 0 && c === 0;
      const isLast = r === lastRow && c === lastCol;

      const frameBuffer = await image
        .clone()
        .extract({
          left: c * frameWidth,
          top: r * frameHeight,
          width: frameWidth,
          height: frameHeight,
        })
        .trim()
        .toBuffer({ resolveWithObject: true })
        .catch(() => null);

      const area = frameBuffer ? frameBuffer.info.width * frameBuffer.info.height : 0;

      if (isFirst && area === 0) {
        return { passed: false, reason: "First frame appears empty or missing subject." };
      }

      if (isLast && area !== 0) {
        return {
          passed: false,
          reason: "Final frame (last cell) must be completely empty, but it contains visible content.",
        };
      }

      if (!isFirst && !isLast && area === 0) {
        return { passed: false, reason: `Frame at row ${r}, col ${c} is completely empty.` };
      }
    }
  }

  return { passed: true };
}

export async function validateWithLLM(
  imageBuffer: Buffer,
  params: SpritesheetPromptParams,
): Promise<QAResult> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY missing, skipping LLM QA.");
    return { passed: true, reason: "API key missing", confidence: 0 };
  }
  const ai = new GoogleGenAI({ apiKey });

  const { cols, rows, subject, animationAction, keyframes } = params;
  const prompt = `You are an expert animation QA tester. This image is a spritesheet grid (${cols} columns × ${rows} rows) showing an animation sequence of: ${subject} ${animationAction}.
The animation is intended to progress according to these keyframes: ${JSON.stringify(keyframes)}.

IMPORTANT: The FINAL frame (last cell: row ${rows}, column ${cols}) must be COMPLETELY EMPTY (pure background color, absolutely no subject, particles, or debris). If it is not empty, you MUST fail QA and state this as an issue.

**Your tasks:**
1. Assess if the frames present a continuous, logical progression WITHOUT hallucinations, sudden jumps in art style, or magically appearing/disappearing elements. Set isContinuous to false and list specific issues if not.
2. When isContinuous is false, you MUST also provide editInstructions: a single, super detailed instruction (2–4 paragraphs) that will be sent directly to an image-editing model to fix this spritesheet. The image model does NOT understand "frame 7" or "frame N". It only understands grid positions. So in editInstructions you MUST:
   - Describe locations as "the cell in row X, column Y" or "the cell in the Nth row, Mth column from the left". Grid is ${cols} columns × ${rows} rows; frames are left-to-right then top-to-bottom (frame 1 = row 1 col 1; frame ${cols + 1} = row 2 col 1).
   - State exactly WHAT to fix in each relevant cell (e.g. style mismatch, missing subject, wrong pose).
   - State exactly HOW to fix it (e.g. "match the line weight and colors of the cell in row 1, column 2", "redraw so the subject fades smoothly into the background", "remove the extra element").
   - Keep the same subject (${subject}), animation action (${animationAction}), art style, and white background. Do not change grid size or frame count.
   - Write in imperative form, ready to paste to the image model (e.g. "Edit this spritesheet so that: ..."). No preamble or meta-commentary.
When isContinuous is true, set editInstructions to an empty string.`;

  /** JSON schema for structured response; model returns this shape without needing to describe it in the prompt. */
  const responseSchema = {
    type: "object" as const,
    properties: {
      isContinuous: {
        type: "boolean" as const,
        description: "Whether the animation progression is continuous and logical",
      },
      confidence: { type: "number" as const, description: "Confidence score 0-1" },
      issues: {
        type: "array" as const,
        items: { type: "string" as const },
        description:
          "List of specific issues (e.g. frame numbers, style jumps); empty when passing",
      },
      editInstructions: {
        type: "string" as const,
        description:
          "When isContinuous is false: full instruction for the image-editing model (grid positions, what to fix, how). When true: empty string.",
      },
    },
    required: ["isContinuous", "confidence", "issues", "editInstructions"] as const,
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType: "image/png",
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const text = response.text ?? "{}";
    const data = JSON.parse(text) as {
      isContinuous?: boolean;
      confidence?: number;
      issues?: string[];
      editInstructions?: string;
    };

    const confidence =
      typeof data.confidence === "number" && data.confidence >= 0 && data.confidence <= 1
        ? data.confidence
        : undefined;

    if (data.isContinuous === false) {
      const issues = Array.isArray(data.issues) ? data.issues : [];
      const editInstructions =
        typeof data.editInstructions === "string" ? data.editInstructions.trim() : undefined;
      return {
        passed: false,
        reason: issues.join(", ") || "Failed LLM QA",
        confidence,
        issues,
        editInstructions: editInstructions || undefined,
      };
    }

    return { passed: true, confidence };
  } catch (err) {
    console.warn("LLM QA Error:", err);
    return { passed: true, reason: "Error in LLM QA, skipping", confidence: 0 };
  }
}
