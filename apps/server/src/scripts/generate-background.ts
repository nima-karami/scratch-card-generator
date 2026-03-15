#!/usr/bin/env npx tsx
import "dotenv/config";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { generateBackground } from "../lib/background.js";
import { generateLoopedVideoBackground, writeBackgroundDebug } from "../lib/veo.js";
import { config } from "../config.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-background -- --visual-style "<style>" [--mode image|video] [options]

  --mode image   Generate background image only (default output: ./output/background.png).
  --mode video   Generate image then attempt looped video; on video failure, output image only.
                 Writes <output-stem>-frame.png and --output for video (default: ./output/background.mp4).

Options:
  --visual-style <text>     Style for the background image. Same as Creative Director videoBackground.visualStyle. Required unless --image is used.
  --animation-prompt <text> Description for video motion. Required for --mode video when not using --image.
  --mode <image|video>      image = PNG only; video = image + attempt VEO video (fallback to image on failure). Default: video.
  --duration <4|6|8>       Video length in seconds (mode video). Default: 6
  --aspect-ratio <ratio>    9:16 (portrait, default) or 16:9 (landscape)
  --output <path>           Output path: for image mode the PNG path; for video mode the MP4 path. Defaults: ./output/background.png (image) or ./output/background.mp4 (video).
  --image <path>            Use this image as first and last frame (skip image generation). Only used when --mode video.
`;

const DEFAULT_ANIMATION_PROMPT = "subtle ambient motion, seamless loop";

function parseDuration(s: string | undefined): 4 | 6 | 8 {
  const n = s ? parseInt(s, 10) : 6;
  if (n === 4 || n === 6 || n === 8) return n;
  return 6;
}

function outputStem(path: string): string {
  const lastDot = path.lastIndexOf(".");
  return lastDot > 0 ? path.slice(0, lastDot) : path;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opts = parseNamedArgs(argv);

  const mode = (opts.mode ?? "video") === "image" ? "image" : "video";
  const imagePath = opts.image;
  const visualStyle = opts["visual-style"];
  const animationPrompt =
    opts["animation-prompt"] ?? (imagePath ? DEFAULT_ANIMATION_PROMPT : undefined);

  if (!imagePath && !visualStyle) {
    console.error("Error: --visual-style is required when not using --image.");
    console.error(USAGE);
    process.exit(1);
  }
  if (mode === "video" && !imagePath && !animationPrompt) {
    console.error("Error: --animation-prompt is required for --mode video when not using --image.");
    console.error(USAGE);
    process.exit(1);
  }

  const duration = parseDuration(opts.duration);
  const aspectRatio = opts["aspect-ratio"] === "16:9" ? "16:9" : "9:16";
  const defaultOutput = mode === "image" ? "./output/background.png" : "./output/background.mp4";
  const outputPath = opts.output ?? defaultOutput;

  try {
    if (mode === "image" && !imagePath) {
      console.log("Generating background image...");
      const { image } = await generateBackground({
        visualStyle: visualStyle!,
        mode: "image",
        aspectRatio,
      });
      await writeFile(outputPath, image);
      console.log("Saved to", outputPath);
      return;
    }

    if (mode === "image" && imagePath) {
      console.error("Error: --image is only used with --mode video.");
      process.exit(1);
    }

    // mode === "video"
    let frameBuffer: Buffer;
    let visualStyleUsed: string | undefined = visualStyle ?? undefined;

    if (imagePath) {
      if (!existsSync(imagePath)) {
        throw new Error(`File not found: ${imagePath}`);
      }
      console.log("Using image:", imagePath);
      frameBuffer = await readFile(imagePath);
      visualStyleUsed = undefined;
    } else {
      console.log("Generating background image...");
      const result = await generateBackground({
        visualStyle: visualStyle!,
        animationPrompt: animationPrompt ?? DEFAULT_ANIMATION_PROMPT,
        mode: "video",
        durationSeconds: duration,
        aspectRatio,
      });
      frameBuffer = result.image;

      const stem = outputStem(outputPath);
      const framePath = `${stem}-frame.png`;
      await Promise.all([
        writeFile(framePath, frameBuffer),
        result.video ? writeFile(outputPath, result.video) : Promise.resolve(),
      ]);

      if (result.video) {
        console.log("Saved video to", outputPath);
        console.log("Saved frame to", framePath);
        if (config.debug.background) {
          await writeBackgroundDebug(
            frameBuffer,
            {
              visualStyle: visualStyleUsed,
              animationPrompt: animationPrompt ?? DEFAULT_ANIMATION_PROMPT,
              durationSeconds: duration,
            },
            result.video
          );
          console.log("Background debug: wrote to", config.debug.background);
        }
      } else {
        console.warn("Video generation failed; saved background image only to", framePath);
      }
      return;
    }

    // --image path provided: we have frameBuffer, now try video only (no generateBackground for image part)
    console.log("Generating looped video (VEO 3.1)...");
    try {
      const videoBuffer = await generateLoopedVideoBackground({
        animationPrompt: animationPrompt ?? DEFAULT_ANIMATION_PROMPT,
        firstAndLastFrameImage: frameBuffer,
        durationSeconds: duration,
        aspectRatio,
      });
      const stem = outputStem(outputPath);
      const framePath = `${stem}-frame.png`;
      await writeFile(framePath, frameBuffer);
      await writeFile(outputPath, videoBuffer);
      console.log("Saved video to", outputPath);
      console.log("Saved frame to", framePath);
      if (config.debug.background) {
        await writeBackgroundDebug(
          frameBuffer,
          {
            visualStyle: undefined,
            animationPrompt: animationPrompt ?? DEFAULT_ANIMATION_PROMPT,
            durationSeconds: duration,
          },
          videoBuffer
        );
        console.log("Background debug: wrote to", config.debug.background);
      }
    } catch (err) {
      console.warn(
        "VEO video generation failed, saving frame only:",
        err instanceof Error ? err.message : String(err)
      );
      const stem = outputStem(outputPath);
      const framePath = `${stem}-frame.png`;
      await writeFile(framePath, frameBuffer);
      console.log("Saved background image to", framePath);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
