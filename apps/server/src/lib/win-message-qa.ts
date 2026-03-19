import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config } from "../config/index.js";

const WIN_MESSAGE_QA_MODEL = "gemini-3.1-flash-image-preview";

const winMessageQAResponseSchema = z.object({
  passed: z.boolean(),
  confidence: z.number().min(0).max(1).describe("Confidence 0..1 that the win message is correct"),
  issues: z.array(z.string()).describe("Empty when passed; otherwise list why it failed"),
});

export type WinMessageQAResult = z.infer<typeof winMessageQAResponseSchema>;

const winMessageQAResponseSchemaJson = {
  type: "object" as const,
  properties: {
    passed: { type: "boolean" as const },
    confidence: { type: "number" as const, description: "Confidence 0..1" },
    issues: { type: "array" as const, items: { type: "string" as const } },
  },
  required: ["passed", "confidence", "issues"] as const,
};

export type ValidateWinMessageWithLLMParams = {
  imageBuffer: Buffer;
  expectedText: string;
  allowedOrnamentsHint?: string;
};

/**
 * LLM QA for win message image generation.
 *
 * Checks that the image contains ONLY the expected win message text as typography
 * (plus allowable typography effects), and does NOT include moodboard/panel/background artifacts.
 */
export async function validateWinMessageWithLLM(
  params: ValidateWinMessageWithLLMParams,
): Promise<WinMessageQAResult> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    return { passed: true, confidence: 0, issues: ["GEMINI_API_KEY missing; skipping QA"] };
  }

  const ai = new GoogleGenAI({ apiKey });
  const { imageBuffer, expectedText, allowedOrnamentsHint } = params;

  const prompt = `You are an expert QA tester for a generated WIN MESSAGE image for a scratch-card game.

The image SHOULD contain ONLY the fixed typography for the win text exactly: "${expectedText}".

Allowed:
- Typography rendering for the letters only (fill, outlines, thickness, texture/grain)
- Typography effects (shadow, drop-shadow, subtle glow, emboss/inner highlight)
- Small letter-adjacent ornaments that are clearly part of the typography treatment (${allowedOrnamentsHint ?? "optional small flourishes next to letters"}).

Forbidden:
- Any external framing, borders, or surrounding composition around the message as a container
- Any background/scene elements, including vines/leaves/palms/pattern panels
- Any appearance of the moodboard panels (e.g. "Graphic Style", "Typography", "Color Palette", "Background Style") or any collage/layout
- Any extra text/words besides "${expectedText}"

Ignore transparency; visually inspect the rendered pixels.
Return ONLY JSON matching the schema.`;

  const response = await ai.models.generateContent({
    model: WIN_MESSAGE_QA_MODEL,
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
      responseSchema: winMessageQAResponseSchemaJson,
    },
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    return { passed: false, confidence: 0, issues: ["Empty QA response from LLM"] };
  }

  const raw = JSON.parse(text) as unknown;
  const parsed = winMessageQAResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { passed: false, confidence: 0, issues: ["QA response schema validation failed"] };
  }

  return parsed.data;
}

