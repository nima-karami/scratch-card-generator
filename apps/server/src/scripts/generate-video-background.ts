#!/usr/bin/env npx tsx
import "dotenv/config";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import {
  generateLoopedVideoBackground,
  generateThemeBackgroundImage,
  writeVideoBackgroundDebug,
} from "../lib/veo.js";
import { config } from "../config.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-video-background -- --visual-style "<style>" --animation-prompt "<motion>" [options]

Options:
  --visual-style <text>    Style for the background image. Same as Creative Director videoBackground.visualStyle. Required unless --image is used.
  --animation-prompt <text> Description for video motion. Same as Creative Director videoBackground.animationPrompt. Required unless --image is used.
  --duration <4|6|8>       Video length in seconds. Default: 6
  --aspect-ratio <ratio>  9:16 (portrait, default) or 16:9 (landscape)
  --output <path>          Output MP4 path (default: ./video-background.mp4)
  --image <path>          Use this image as first and last frame (skip image generation)

Examples:
  npm run generate-video-background -- --visual-style "luxury, golden particles" --animation-prompt "subtle golden particles drifting"
  npm run generate-video-background -- --visual-style "underwater, blue gradient" --animation-prompt "gentle bubbles rising" --duration 8
  npm run generate-video-background -- --image ./frame.png --animation-prompt "soft light flicker" --output loop.mp4
`;

const DEFAULT_ANIMATION_PROMPT = "subtle ambient motion, seamless loop";

function parseDuration(s: string | undefined): 4 | 6 | 8 {
  const n = s ? parseInt(s, 10) : 6;
  if (n === 4 || n === 6 || n === 8) return n;
  return 6;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opts = parseNamedArgs(argv);

  const imagePath = opts.image;
  const visualStyle = opts["visual-style"];
  const animationPrompt = opts["animation-prompt"] ?? (imagePath ? DEFAULT_ANIMATION_PROMPT : undefined);

  if (!imagePath) {
    if (!visualStyle) {
      console.error("Error: --visual-style is required when not using --image.");
      console.error(USAGE);
      process.exit(1);
    }
    if (!animationPrompt) {
      console.error("Error: --animation-prompt is required when not using --image.");
      console.error(USAGE);
      process.exit(1);
    }
  }

  const duration = parseDuration(opts.duration);
  const aspectRatio = opts["aspect-ratio"] === "16:9" ? "16:9" : "9:16";
  const outputPath = opts.output ?? "./video-background.mp4";

  try {
    let frameBuffer: Buffer;

    if (imagePath) {
      if (!existsSync(imagePath)) {
        throw new Error(`File not found: ${imagePath}`);
      }
      console.log("Using image:", imagePath);
      frameBuffer = await readFile(imagePath);
    } else {
      console.log("Generating theme background image...");
      frameBuffer = await generateThemeBackgroundImage({
        visualStyle: visualStyle!,
        aspectRatio,
      });
    }

    console.log("Generating looped video (VEO 3.1)...");
    const videoBuffer = await generateLoopedVideoBackground({
      animationPrompt: animationPrompt ?? DEFAULT_ANIMATION_PROMPT,
      firstAndLastFrameImage: frameBuffer,
      durationSeconds: duration,
      aspectRatio,
    });

    await writeFile(outputPath, videoBuffer);
    console.log("Saved to", outputPath);

    if (config.debug.videoBackground) {
      await writeVideoBackgroundDebug(videoBuffer, frameBuffer, {
        visualStyle: imagePath ? undefined : visualStyle,
        animationPrompt: animationPrompt ?? DEFAULT_ANIMATION_PROMPT,
        durationSeconds: duration,
      });
      console.log("Video background debug: wrote to", config.debug.videoBackground);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
