import type { GenerateVideosConfig, GenerateVideosOperation, Image } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import { appendFile, mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { config } from "../config/index.js";
import { generateImage } from "./gemini.js";

const REFERENCE_IMAGE_PREFIX =
  "The attached image is a tagged moodboard with sections: Graphic Style, Typography, Color Palette, Background Style. For this task use ONLY the BACKGROUND STYLE section as your style reference (the patterned or textured background area). Ignore the other sections. Match that section's visual style, colors, and atmosphere. Output only the requested new image, not an edit of the reference.\n\n";

const VEO_MODEL = "veo-3.1-generate-preview";
const DEFAULT_POLL_INTERVAL_MS = 15_000;
const DEFAULT_POLL_TIMEOUT_MS = 600_000; // 10 min

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

function bufferToImage(buffer: Buffer): Image {
  return {
    imageBytes: buffer.toString("base64"),
    mimeType: "image/png",
  };
}

export type GenerateThemeBackgroundImageParams = {
  /** Style for the background image. Same as Creative Director videoBackground.visualStyle. */
  visualStyle: string;
  /** Aspect ratio for the image, e.g. "9:16" (portrait) or "16:9" (landscape). Default: 9:16 for scratch card. */
  aspectRatio?: string;
  /** When set, generation uses this image as style reference (moodboard) via multimodal API. */
  referenceImage?: Buffer;
};

/**
 * Build a prompt for a loopable background scene (no text, portrait by default, atmospheric).
 * Then generate the image using Gemini.
 */
export async function generateThemeBackgroundImage(
  params: GenerateThemeBackgroundImageParams
): Promise<Buffer> {
  const { visualStyle, aspectRatio = "9:16", referenceImage } = params;
  const isPortrait = aspectRatio === "9:16";
  const parts = [
    "Generate a single atmospheric background image suitable for a scratch card.",
    "No text or text overlays.",
    visualStyle.trim(),
    `Aspect ratio ${aspectRatio}, ${isPortrait ? "portrait orientation, taller than wide." : "landscape."} Suitable for subtle looping animation.`,
  ];
  const fullPrompt = parts.join(" ");
  const prompt = referenceImage ? REFERENCE_IMAGE_PREFIX + fullPrompt : fullPrompt;
  return generateImage(prompt, referenceImage);
}

export type GenerateLoopedVideoBackgroundParams = {
  /** Animation description. Same as Creative Director videoBackground.animationPrompt. */
  animationPrompt: string;
  /** Same image used as first and last frame for a seamless loop. */
  firstAndLastFrameImage: Buffer;
  /** Duration in seconds: 4, 6, or 8. */
  durationSeconds?: 4 | 6 | 8;
  /** Aspect ratio, e.g. "9:16" (portrait) or "16:9" (landscape). Default: 9:16 for scratch card. */
  aspectRatio?: string;
};

/**
 * Generate a looped video using VEO 3.1 with the same image as first and last frame.
 * Polls until complete, then returns the MP4 buffer.
 */
export async function generateLoopedVideoBackground(
  params: GenerateLoopedVideoBackgroundParams
): Promise<Buffer> {
  const {
    animationPrompt,
    firstAndLastFrameImage,
    durationSeconds = 6,
    aspectRatio = "9:16",
  } = params;

  const image = bufferToImage(firstAndLastFrameImage);
  const veoConfig: GenerateVideosConfig = {
    durationSeconds,
    aspectRatio,
    lastFrame: image,
  };

  const ai = getClient();
  let operation: GenerateVideosOperation = await ai.models.generateVideos({
    model: VEO_MODEL,
    prompt: animationPrompt,
    image,
    config: veoConfig,
  });

  const deadline = Date.now() + DEFAULT_POLL_TIMEOUT_MS;
  while (!operation.done) {
    if (Date.now() >= deadline) {
      throw new Error("VEO video generation timed out");
    }
    await new Promise((r) => setTimeout(r, DEFAULT_POLL_INTERVAL_MS));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  if (operation.error) {
    throw new Error(
      `VEO video generation failed: ${JSON.stringify(operation.error)}`
    );
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) {
    throw new Error("VEO returned no video");
  }

  if (video.videoBytes) {
    return Buffer.from(video.videoBytes, "base64");
  }

  if (video.uri) {
    const tmpPath = join(tmpdir(), `veo-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
    await ai.files.download({
      file: video,
      downloadPath: tmpPath,
    });
    const buffer = await readFile(tmpPath);
    await unlink(tmpPath).catch(() => {});
    return buffer;
  }

  throw new Error("VEO video has neither videoBytes nor uri");
}

/** Next sequential 4-digit ID for background debug (0001, 0002, …). */
export async function nextBackgroundDebugId(debugDir: string): Promise<string> {
  const prefixMatch = /^(\d{4})-/;
  let maxId = 0;
  try {
    const files = await readdir(debugDir);
    for (const name of files) {
      const m = name.match(prefixMatch);
      if (m) {
        const n = parseInt(m[1]!, 10);
        if (n > maxId) maxId = n;
      }
    }
  } catch {
    // directory missing or unreadable; next id will be 0001
  }
  return String(maxId + 1).padStart(4, "0");
}

function slugFromParams(
  params: { visualStyle?: string; animationPrompt?: string },
  maxLen = 40
): string {
  const s = [params.visualStyle, params.animationPrompt].filter(Boolean).join(" ");
  const slug = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug.slice(0, maxLen) || "background";
}

export type WriteBackgroundDebugParams = {
  visualStyle?: string;
  animationPrompt: string;
  durationSeconds: number;
};

/**
 * When config.debug.background is set, write the frame image and optionally the video
 * as NNNN-slug-frame.png and (if video provided) NNNN-slug.mp4, and append a line to background-log.txt.
 */
export async function writeBackgroundDebug(
  frameBuffer: Buffer,
  params: WriteBackgroundDebugParams,
  videoBuffer?: Buffer
): Promise<void> {
  const debugDir = config.debug.background;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const debugId = await nextBackgroundDebugId(debugDir);
  const slug = slugFromParams(params);
  const frameFilename = `${debugId}-${slug}-frame.png`;
  await writeFile(join(debugDir, frameFilename), frameBuffer);
  let videoFilename: string | undefined;
  if (videoBuffer) {
    videoFilename = `${debugId}-${slug}.mp4`;
    await writeFile(join(debugDir, videoFilename), videoBuffer);
  }
  const logPath = join(debugDir, "background-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\tvisualStyle="${params.visualStyle ?? ""}"\tanimationPrompt="${params.animationPrompt}"\tduration=${params.durationSeconds}\tframe=${frameFilename}${videoFilename ? `\tfile=${videoFilename}` : "\timage-only"}\n`;
  await appendFile(logPath, line);
}
