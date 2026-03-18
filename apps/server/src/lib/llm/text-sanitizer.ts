import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { config } from "../../config/index.js";

const SANITIZER_MODEL = "gemini-3.1-flash-latest";
const DEFAULT_MAX_RETRIES = 2;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = config.gemini.apiKey;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const sanitizedResponseSchema = z.object({
  sanitized: z.string().describe("Sanitized replacement text. No extra commentary."),
});

export type SanitizeTextWithLLMParams = {
  inputText: string;
  constraintsText: string;
  model?: string;
  maxRetries?: number;
};

function normalizeSanitizedText(input: string): string {
  let s = input.trim();
  // Remove occasional wrapping quotes/backticks without being too aggressive.
  const wrapped =
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith("`") && s.endsWith("`"));
  if (wrapped && s.length >= 2) s = s.slice(1, -1).trim();
  // Keep it embedding-friendly for larger prompts.
  s = s.replace(/\r?\n+/g, " ").replace(/\s+/g, " ");
  return s;
}

/**
 * Generic prompt/text sanitizer.
 * Returns only a sanitized replacement string (caller can embed it into a larger prompt).
 */
export async function sanitizeTextWithLLM(
  params: SanitizeTextWithLLMParams,
): Promise<string> {
  const { inputText, constraintsText } = params;
  if (!inputText.trim()) return "";
  if (!constraintsText.trim()) return inputText.trim();

  const maxRetries = params.maxRetries ?? DEFAULT_MAX_RETRIES;
  const model = params.model ?? SANITIZER_MODEL;
  const ai = getClient();

  const systemInstruction = `You are a meticulous text sanitizer for creative prompt fragments.
Return only a single sanitized replacement string that obeys the constraints.
Do not add commentary, explanations, or quotes around the final string.`;

  const userMessage = `INPUT_TEXT:
${inputText}

CONSTRAINTS:
${constraintsText}

TASK:
Rewrite INPUT_TEXT so it obeys CONSTRAINTS.
Keep the same general meaning and stylistic intent, but remove or rewrite any disallowed framing/background/scene instructions described in CONSTRAINTS.
Return JSON of the form: {"sanitized": "<string>"} only.`;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: sanitizedResponseSchema,
        },
      });

      const text = response.text?.trim();
      if (!text) {
        lastError = new Error("Empty sanitizer response");
        continue;
      }

      const raw = JSON.parse(text) as unknown;
      const parsed = sanitizedResponseSchema.safeParse(raw);
      if (!parsed.success) {
        lastError = parsed.error;
        continue;
      }

      return normalizeSanitizedText(parsed.data.sanitized);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Text sanitizer failed after ${maxRetries} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

