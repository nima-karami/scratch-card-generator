import { GoogleGenAI } from "@google/genai";

const IMAGE_MODEL = "gemini-3.1-flash-image-preview";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * Generates an image from a text prompt using Nano Banana Pro (Gemini 3 Pro Image).
 * Returns the raw PNG buffer.
 */
export async function generateImage(prompt: string): Promise<Buffer> {
  const ai = getClient();
  const interaction = await ai.interactions.create({
    model: IMAGE_MODEL,
    input: prompt,
    response_modalities: ["image"],
  });

  const outputs = interaction.outputs ?? [];
  for (const output of outputs) {
    if (output.type === "image" && output.data) {
      return Buffer.from(output.data, "base64");
    }
  }

  throw new Error("No image in response from Gemini");
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
  const base64Image = sourceImage.toString("base64");

  const interaction = await ai.interactions.create({
    model: IMAGE_MODEL,
    input: [
      { type: "image", data: base64Image, mime_type: "image/png" },
      { type: "text", text: instruction },
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
}
