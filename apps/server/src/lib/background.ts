import { generateThemeBackgroundImage } from "./veo.js";
import { generateLoopedVideoBackground } from "./veo.js";

export type GenerateBackgroundParams = {
  /** Style for the background image. Same as Creative Director videoBackground.visualStyle. */
  visualStyle: string;
  /** Animation description for video. Required when mode is "video". */
  animationPrompt?: string;
  /** "image" = PNG only; "video" = image + attempt VEO video (fallback to image on failure). */
  mode: "image" | "video";
  /** Video duration in seconds: 4, 6, or 8. Used when mode is "video". Default: 6. */
  durationSeconds?: 4 | 6 | 8;
  /** Aspect ratio, e.g. "9:16" (portrait) or "16:9" (landscape). Default: 9:16. */
  aspectRatio?: string;
  /** When set, background image generation uses this as style reference (moodboard) via multimodal API. */
  referenceImage?: Buffer;
};

export type GenerateBackgroundResult = {
  /** Always present: the background image (PNG). */
  image: Buffer;
  /** Present when mode is "video" and VEO succeeded. */
  video?: Buffer;
};

/**
 * Generate a scratch-card background: always produces an image; optionally attempts
 * a looped video. On video failure (e.g. VEO not available), returns the image only
 * and does not throw.
 */
export async function generateBackground(
  params: GenerateBackgroundParams
): Promise<GenerateBackgroundResult> {
  const {
    visualStyle,
    animationPrompt,
    mode,
    durationSeconds = 6,
    aspectRatio = "9:16",
    referenceImage,
  } = params;

  const image = await generateThemeBackgroundImage({
    visualStyle,
    aspectRatio,
    referenceImage,
  });

  if (mode === "image") {
    return { image };
  }

  if (!animationPrompt?.trim()) {
    return { image };
  }

  try {
    const video = await generateLoopedVideoBackground({
      animationPrompt: animationPrompt.trim(),
      firstAndLastFrameImage: image,
      durationSeconds,
      aspectRatio,
    });
    return { image, video };
  } catch (err) {
    console.warn(
      "VEO video generation failed, returning background image only:",
      err instanceof Error ? err.message : String(err)
    );
    return { image };
  }
}
