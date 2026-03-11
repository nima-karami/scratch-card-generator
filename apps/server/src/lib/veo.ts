import type { GenerateVideosConfig, GenerateVideosOperation, Image } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import { appendFile, mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { config } from "../config.js";
import { generateImage } from "./gemini.js";

const VEO_MODEL = "veo-3.1-generate-preview";
const DEFAULT_POLL_INTERVAL_MS = 15_000;
const DEFAULT_POLL_TIMEOUT_MS = 600_000; // 10 min

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

function bufferToImage(buffer: Buffer): Image {
  return {
    imageBytes: buffer.toString("base64"),
    mimeType: "image/png",
  };
}

export type GenerateThemeBackgroundImageParams = {
  theme?: string;
  prompt?: string;
  /** Aspect ratio for the image, e.g. "9:16" (portrait) or "16:9" (landscape). Default: 9:16 for scratch card. */
  aspectRatio?: string;
};

/**
 * Build a prompt for a loopable background scene (no text, portrait by default, atmospheric).
 * Then generate the image using Gemini.
 */
export async function generateThemeBackgroundImage(
  params: GenerateThemeBackgroundImageParams
): Promise<Buffer> {
  const { theme = "elegant", prompt = "", aspectRatio = "9:16" } = params;
  const parts = [
    "Generate a single atmospheric background image suitable for a scratch card.",
    "No text or text overlays. Style:",
    theme.trim() || "elegant",
    ".",
  ];
  if (prompt.trim()) {
    parts.push(prompt.trim());
  }
  const isPortrait = aspectRatio === "9:16";
  parts.push(
    `Aspect ratio ${aspectRatio}, ${isPortrait ? "portrait orientation, taller than wide." : "landscape."} Suitable for subtle looping animation.`
  );
  const fullPrompt = parts.join(" ");
  return generateImage(fullPrompt);
}

export type GenerateLoopedVideoBackgroundParams = {
  /** Animation description (e.g. "subtle clouds drifting, soft light changes"). */
  prompt: string;
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
    prompt,
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
    prompt,
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

/** Next sequential 4-digit ID for video-background debug (0001, 0002, …). */
export async function nextVideoBackgroundDebugId(debugDir: string): Promise<string> {
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
  params: {
    theme?: string;
    prompt?: string;
    animationPrompt?: string;
  },
  maxLen = 40
): string {
  const s = [params.theme, params.prompt, params.animationPrompt].filter(Boolean).join(" ");
  const slug = s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug.slice(0, maxLen) || "video-background";
}

export type WriteVideoBackgroundDebugParams = {
  theme?: string;
  prompt?: string;
  animationPrompt: string;
  durationSeconds: number;
};

/**
 * When config.videoBackground.debugOutputDir is set, write the video and frame image
 * as NNNN-slug.mp4 and NNNN-slug-frame.png, and append a line to video-background-log.txt.
 */
export async function writeVideoBackgroundDebug(
  videoBuffer: Buffer,
  frameBuffer: Buffer,
  params: WriteVideoBackgroundDebugParams
): Promise<void> {
  const debugDir = config.videoBackground.debugOutputDir;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const debugId = await nextVideoBackgroundDebugId(debugDir);
  const slug = slugFromParams(params);
  const videoFilename = `${debugId}-${slug}.mp4`;
  const frameFilename = `${debugId}-${slug}-frame.png`;
  await writeFile(join(debugDir, videoFilename), videoBuffer);
  await writeFile(join(debugDir, frameFilename), frameBuffer);
  const logPath = join(debugDir, "video-background-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\ttheme="${params.theme ?? ""}"\tprompt="${params.prompt ?? ""}"\tanimationPrompt="${params.animationPrompt}"\tduration=${params.durationSeconds}\tfile=${videoFilename}\tframe=${frameFilename}\n`;
  await appendFile(logPath, line);
}
