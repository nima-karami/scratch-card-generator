import { appendFile, mkdir, readdir, writeFile } from "fs/promises";
import { join } from "path";
import { config } from "../config.js";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

function getApiKey(): string {
  const key = config.elevenlabs.apiKey;
  if (!key) {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }
  return key;
}

/** Clamp duration to Eleven Labs range 0.5–30 seconds. */
function clampDuration(duration: number): number {
  return Math.min(30, Math.max(0.5, duration));
}

export type GenerateSoundEffectParams = {
  text: string;
  durationSeconds?: number;
  loop?: boolean;
  outputFormat?: string;
};

/**
 * Consume an async iterable or ReadableStream into a single Buffer.
 */
async function streamToBuffer(source: unknown): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const stream = source as ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>;
  if (typeof (stream as ReadableStream).getReader === "function") {
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
  }
  return Buffer.concat(chunks);
}

/**
 * Generate a sound effect from a text prompt using Eleven Labs text-to-sound-effects API.
 * Returns the audio as a Buffer (e.g. MP3).
 */
export async function generateSoundEffect(params: GenerateSoundEffectParams): Promise<Buffer> {
  const durationSeconds =
    params.durationSeconds != null ? clampDuration(params.durationSeconds) : undefined;
  const apiKey = getApiKey();
  const client = new ElevenLabsClient({ apiKey });
  type SoundEffectRequest = Parameters<ElevenLabsClient["textToSoundEffects"]["convert"]>[0];
  const request: SoundEffectRequest = {
    text: params.text,
    ...(durationSeconds != null && { durationSeconds }),
    ...(params.loop != null && { loop: params.loop }),
  };
  if (params.outputFormat != null) {
    (request as { outputFormat?: string }).outputFormat = "mp3_44100_128";
  }
  const stream = await client.textToSoundEffects.convert(request);
  if (stream == null) {
    throw new Error("Eleven Labs API returned no audio stream");
  }
  return streamToBuffer(stream);
}

/** Next sequential 4-digit ID for sound-effect debug (0001, 0002, …). Scans dir for existing NNNN-* filenames. */
export async function nextSoundEffectDebugId(debugDir: string): Promise<string> {
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

function slugFromPrompt(prompt: string, maxLen = 40): string {
  const slug = prompt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return slug.slice(0, maxLen) || "sound";
}

export type WriteSoundEffectDebugParams = {
  prompt: string;
  durationSeconds: number;
  loop: boolean;
};

/**
 * When config.elevenlabs.debugOutputDir is set, write the buffer there as NNNN-slug.mp3
 * and append a line to sound-effect-log.txt. No-op when debug output dir is not set.
 */
export async function writeSoundEffectDebug(
  buffer: Buffer,
  params: WriteSoundEffectDebugParams,
): Promise<void> {
  const debugDir = config.elevenlabs.debugOutputDir;
  if (!debugDir) return;
  await mkdir(debugDir, { recursive: true });
  const debugId = await nextSoundEffectDebugId(debugDir);
  const slug = slugFromPrompt(params.prompt);
  const filename = `${debugId}-${slug}.mp3`;
  const filePath = join(debugDir, filename);
  await writeFile(filePath, buffer);
  const logPath = join(debugDir, "sound-effect-log.txt");
  const line = `${new Date().toISOString()}\t${debugId}\tprompt="${params.prompt}"\tduration=${params.durationSeconds}\tloop=${params.loop}\tfile=${filename}\n`;
  await appendFile(logPath, line);
}
