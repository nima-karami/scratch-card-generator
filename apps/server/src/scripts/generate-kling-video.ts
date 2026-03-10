#!/usr/bin/env npx tsx
import "dotenv/config";
import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { generateKlingVideo, pollUntilComplete } from "../lib/kling.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-kling-video -- --prompt "<description>" [options]

Options:
  --prompt <text>        Video description (required)
  --start-frame <path|url>  Start frame image (path or URL). Omit for text-to-video.
  --end-frame <path|url>    End frame image (path or URL). Optional for image-to-video.
  --model <name>         Ignored (Kling 3.0 uses --mode: standard | professional)
  --duration <sec>      Duration in seconds (3-15). Default: 5
  --output <path>       Output video path (default: ./output.mp4)

Examples:
  npm run generate-kling-video -- --prompt "A cat playing piano in a jazz club"
  npm run generate-kling-video -- --prompt "Sunset over the ocean" --start-frame ./frame.png --output ./video.mp4
  npm run generate-kling-video -- --prompt "Morph from A to B" --start-frame ./start.png --end-frame ./end.png
`;

function isUrl(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://");
}

async function toFrameInput(pathOrUrl: string): Promise<string> {
  if (isUrl(pathOrUrl)) return pathOrUrl;
  if (!existsSync(pathOrUrl)) {
    throw new Error(`File not found: ${pathOrUrl}`);
  }
  const buf = await readFile(pathOrUrl);
  const base64 = buf.toString("base64");
  const ext = pathOrUrl.toLowerCase().split(".").pop() || "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${base64}`;
}

async function main(): Promise<void> {
  const opts = parseNamedArgs();
  const prompt = opts.prompt;
  if (!prompt) {
    console.error("Error: --prompt is required.");
    console.error(USAGE);
    process.exit(1);
  }

  const durationNum = opts.duration ? parseInt(opts.duration, 10) : 5;
  const duration = Number.isNaN(durationNum) ? 5 : Math.min(15, Math.max(3, durationNum));
  const outputPath = opts.output ?? "./output.mp4";

  let startFrame: string | undefined;
  let endFrame: string | undefined;
  if (opts["start-frame"]) {
    startFrame = await toFrameInput(opts["start-frame"]);
  }
  if (opts["end-frame"]) {
    endFrame = await toFrameInput(opts["end-frame"]);
  }

  try {
    console.log("Submitting to Kling...");
    const { taskId } = await generateKlingVideo({
      prompt,
      startFrame,
      endFrame,
      model: opts.model,
      duration,
      aspect_ratio: "16:9",
      mode: "professional",
    });
    console.log("Task ID:", taskId);
    console.log("Polling for completion (this may take 1–2 minutes)...");
    const videoUrl = await pollUntilComplete(taskId, {
      timeoutMs: 10 * 60 * 1000,
      intervalMs: 15 * 1000,
    });
    console.log("Downloading video...");
    const res = await fetch(videoUrl);
    if (!res.ok) {
      throw new Error(`Failed to download video: ${res.status}`);
    }
    const videoBuffer = Buffer.from(await res.arrayBuffer());
    await writeFile(outputPath, videoBuffer);
    console.log("Saved to", outputPath);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
