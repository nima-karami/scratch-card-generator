import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config } from "../config/index.js";

const TITLE_IMAGE_QA_MODEL = "gemini-3.1-flash-image-preview";

const titleImageQAResponseSchema = z.object({
  passed: z.boolean(),
  confidence: z.number().min(0).max(1).describe("Confidence 0..1 that the title image is correct"),
  issues: z.array(z.string()).describe("Empty when passed; otherwise list why it failed"),
});

export type TitleImageQAResult = z.infer<typeof titleImageQAResponseSchema>;

const titleImageQAResponseSchemaJson = {
  type: "object" as const,
  properties: {
    passed: { type: "boolean" as const },
    confidence: { type: "number" as const, description: "Confidence 0..1" },
    issues: { type: "array" as const, items: { type: "string" as const } },
  },
  required: ["passed", "confidence", "issues"] as const,
};

export type ValidateTitleImageWithLLMParams = {
  imageBuffer: Buffer;
  expectedTitleText: string;
  /** Optional hints about allowed ornaments (kept in text) */
  allowedOrnamentsHint?: string;
};

/**
 * LLM QA for title image generation.
 *
 * Checks that the image contains ONLY the expected title text (plus allowed small letter-adjacent ornaments),
 * and does NOT include external framing/background/foliage/extra text.
 */
export async function validateTitleImageWithLLM(
  params: ValidateTitleImageWithLLMParams,
): Promise<TitleImageQAResult> {
  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    return { passed: true, confidence: 0, issues: ["GEMINI_API_KEY missing; skipping QA"] };
  }

  const ai = new GoogleGenAI({ apiKey });
  const { imageBuffer, expectedTitleText, allowedOrnamentsHint } = params;

  const prompt = `You are an expert QA tester for a generated title image for a scratch-card game.
The image SHOULD contain:
1) ONLY the title typography: exactly the text "${expectedTitleText}"
2) Allowed: small decorative ornaments that are directly next to/attached to the lettering (e.g. water drops/splashes, tiny shells/bubbles). ${allowedOrnamentsHint ? `Allowed ornaments hint: ${allowedOrnamentsHint}` : ""}

The image MUST NOT contain:
- Any external framing or surrounding composition (e.g. “framed by foliage”, borders around the whole title as a container)
- Any surrounding background/scene elements behind/around the letters (e.g. vines, palm trees, leaves as an enclosing frame)
- Any extra text/words beyond "${expectedTitleText}"

Ignore transparency. Visually inspect the rendered pixels and decide if there are non-letter objects or extra text.

Return ONLY the JSON matching the response schema.`;

  const response = await ai.models.generateContent({
    model: TITLE_IMAGE_QA_MODEL,
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
      responseSchema: titleImageQAResponseSchemaJson,
    },
  });

  const text = response.text?.trim() ?? "";
  if (!text) {
    return { passed: false, confidence: 0, issues: ["Empty QA response from LLM"] };
  }

  const raw = JSON.parse(text) as unknown;
  const parsed = titleImageQAResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { passed: false, confidence: 0, issues: ["QA response schema validation failed"] };
  }

  return parsed.data;
}

