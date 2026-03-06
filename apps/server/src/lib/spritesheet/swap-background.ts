import { editImage } from "../gemini.js";

/**
 * Swaps the background color of an image using Gemini's image editing.
 * Used to produce a black-background variant from a white-background image
 * for the two-pass alpha extraction technique.
 */
export async function swapBackground(
  imageBuffer: Buffer,
  from: "white" | "black",
  to: "white" | "black"
): Promise<Buffer> {
  const fromHex = from === "white" ? "#FFFFFF" : "#000000";
  const toHex = to === "white" ? "#FFFFFF" : "#000000";

  const instruction = `Change ONLY the background color of this image from pure ${from} ${fromHex} to pure ${to} ${toHex}. Do not alter any of the sprite content, colors, positions, shapes, or details whatsoever. The background must become a solid uniform ${to} color everywhere it was previously ${from}.`;

  return editImage(imageBuffer, instruction);
}
