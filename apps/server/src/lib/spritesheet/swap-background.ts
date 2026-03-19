import { editImage } from "../gemini.js";

/**
 * Swaps the background color of an image using Gemini's image editing.
 * Used to produce a black-background variant from a white-background image
 * for the two-pass alpha extraction technique.
 */
export async function swapBackground(
  imageBuffer: Buffer,
  from: "white" | "black",
  to: "white" | "black",
  aspectRatio: "1:1" | "4:3" | "16:9" | "9:16" = "1:1"
): Promise<Buffer> {
  const fromHex = from === "white" ? "#FFFFFF" : "#000000";
  const toHex = to === "white" ? "#FFFFFF" : "#000000";

  const instruction = `Change the background of this image from pure ${from} ${fromHex} to pure ${to} ${toHex}.

1. Replace all solid ${from} background areas with solid uniform ${to} ${toHex}.
2. Preserve all fully opaque sprite content: do not change its colors, positions, shapes, or details.
3. Important: Where the image is transparent or semi-transparent (e.g. fading edges, ghostly or faint areas that were blending with the ${from} background), update those regions so they blend with the new ${to} background instead. They should not stay as light/white/grey patches on ${to}; they should visually integrate with ${to} (e.g. darken toward ${toHex} where they were fading toward ${fromHex}). The goal is that transparent and semi-transparent areas look correct on the new background, not like opaque blobs.
4. DO NOT add any noise, dust, glow, or new elements to the background. If a section of the image is pure ${from} ${fromHex}, it must become pure solid ${to} ${toHex}. Do not leave any grey or colored smudges in the empty space.`;

  return editImage(imageBuffer, instruction, aspectRatio);
}
