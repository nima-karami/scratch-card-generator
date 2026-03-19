import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config } from "../config/index.js";

const NUMBERS_HEADER_QA_MODEL = "gemini-3.1-flash-image-preview";

const numbersHeaderQAResponseSchema = z.object({
  passed: z.boolean(),
  confidence: z.number().min(0).max(1).describe("Confidence 0..1 that the header pair is correct"),
  issues: z.array(z.string()).describe("Empty when passed; otherwise list why it failed"),
});

export type NumbersHeaderQAResult = z.infer<typeof numbersHeaderQAResponseSchema>;

const numbersHeaderQAResponseSchemaJson = {
  type: "object" as const,
  properties: {
    passed: { type: "boolean" as const },
    confidence: { type: "number" as const, description: "Confidence 0..1" },
    issues: { type: "array" as const, items: { type: "string" as const } },
  },
  required: ["passed", "confidence", "issues"] as const,
};

export type ValidateNumbersHeaderPairWithLLMParams = {
  imageBuffer: Buffer;
  expectedTopText: string;
  expectedBottomText: string;
  allowedOrnamentsHint?: string;
};

/**
 * LLM QA for Lucky/Your numbers header wordmark pair.
 *
 * Runs on the combined TWO-LINE render (before we split into top/bottom PNGs).
 * The QA focuses on legibility + correctness of the expected text lines.
 */
export async function validateNumbersHeaderPairWithLLM(
  params: ValidateNumbersHeaderPairWithLLMParams,
): Promise<NumbersHeaderQAResult> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    return { passed: true, confidence: 0, issues: ["GEMINI_API_KEY missing; skipping QA"] };
  }

  const ai = new GoogleGenAI({ apiKey });
  const { imageBuffer, expectedTopText, expectedBottomText, allowedOrnamentsHint } = params;

  const prompt = `You are an expert QA tester for a generated TWO-LINE numbers header wordmark.

The image SHOULD contain exactly:
1) Top line text exactly: "${expectedTopText}"
2) Bottom line text exactly: "${expectedBottomText}"

Allowed:
- Typography effects (fill, outline, shadows, glow, emboss/inner highlights)
- Small letter-adjacent ornaments that are clearly part of the typography treatment${allowedOrnamentsHint ? ` (Allowed ornaments hint: ${allowedOrnamentsHint})` : ""}.

Forbidden:
- Any extra words/text besides the two expected lines
- Any moodboard panels/sections, background/scene elements, or framing around the header typography
- Any additional UI panels

Legibility requirement (critical):
- Both lines must be clearly readable and spelled correctly; fail if letters are garbled, unreadable, distorted, or too low-contrast to confidently read.

Ignore transparency. Visually inspect the rendered pixels.

Return ONLY JSON matching the response schema.`;

  const response = await ai.models.generateContent({
    model: NUMBERS_HEADER_QA_MODEL,
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
      responseSchema: numbersHeaderQAResponseSchemaJson,
    },
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    return { passed: false, confidence: 0, issues: ["Empty QA response from LLM"] };
  }

  const raw = JSON.parse(text) as unknown;
  const parsed = numbersHeaderQAResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { passed: false, confidence: 0, issues: ["QA response schema validation failed"] };
  }

  return parsed.data;
}

