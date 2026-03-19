import { GoogleGenAI } from "@google/genai";
import { config } from "../config/index.js";

const IMAGE_MODEL = "gemini-3.1-flash-image-preview";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = config.gemini.apiKey;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryGeminiImageError(err: unknown): boolean {
  // The issue we saw in the job: 400 "Model failed to generate an image asset"
  const msg = err instanceof Error ? err.message : String(err);
  return /400/i.test(msg) && /image asset/i.test(msg);
}

/**
 * Generates an image from a text prompt and an optional reference image.
 * If a reference image is provided, it is passed via multimodal input (inlineData)
 * rather than as an image to be edited.
 * Returns the raw PNG buffer.
 */
export async function generateImage(prompt: string, referenceImage?: Buffer): Promise<Buffer> {
  const ai = getClient();
  const maxAttempts = Math.max(1, config.gemini.imageRetries ?? 3);

  let lastErr: unknown;
  let attemptPrompt = prompt;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const input: Array<
      | { type: "text"; text: string }
      | { type: "image"; mime_type: "image/png"; data: string }
    > = [];

    if (referenceImage) {
      input.push({
        type: "image",
        mime_type: "image/png",
        data: referenceImage.toString("base64"),
      });
    }

    input.push({
      type: "text",
      text: attemptPrompt,
    });

    try {
      const interaction = await ai.interactions.create({
        model: IMAGE_MODEL,
        input,
        response_modalities: ["image"],
      });

      const outputs = interaction.outputs ?? [];
      for (const output of outputs) {
        if (output.type === "image" && output.data) {
          return Buffer.from(output.data, "base64");
        }
      }

      // If we got a response but no image data, treat that as retryable.
      throw new Error("No image in response from Gemini");
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !shouldRetryGeminiImageError(err)) throw err;

      const errMsg = err instanceof Error ? err.message : String(err);
      attemptPrompt =
        `${prompt}\n\n[Retry ${attempt}/${maxAttempts}] Previous Gemini error: ${errMsg}\n` +
        "Please retry and produce a valid PNG image asset. If the previous attempt failed, try a cleaner composition and ensure an image is returned in the outputs.";

      // Small backoff so we don't instantly hammer the model on repeated failures.
      await sleep(500 * attempt);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Sends an existing image + text instruction to Gemini to produce an edited version.
 * Used for operations like changing background color.
 */
export async function editImage(
  sourceImage: Buffer,
  instruction: string
): Promise<Buffer> {
  const ai = getClient();
  const maxAttempts = Math.max(1, config.gemini.imageRetries ?? 3);

  const base64Image = sourceImage.toString("base64");

  let lastErr: unknown;
  let attemptInstruction = instruction;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const interaction = await ai.interactions.create({
        model: IMAGE_MODEL,
        input: [
          { type: "image", data: base64Image, mime_type: "image/png" },
          { type: "text", text: attemptInstruction },
        ],
        response_modalities: ["image"],
      });

      const outputs = interaction.outputs ?? [];
      for (const output of outputs) {
        if (output.type === "image" && output.data) {
          return Buffer.from(output.data, "base64");
        }
      }

      throw new Error("No image in response from Gemini edit");
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !shouldRetryGeminiImageError(err)) throw err;

      const errMsg = err instanceof Error ? err.message : String(err);
      attemptInstruction =
        `${instruction}\n\n[Retry ${attempt}/${maxAttempts}] Previous Gemini error: ${errMsg}\n` +
        "Please retry and produce a valid edited PNG image asset. Ensure the model returns image output data.";

      await sleep(500 * attempt);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
