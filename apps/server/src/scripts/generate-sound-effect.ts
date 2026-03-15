#!/usr/bin/env npx tsx
import "dotenv/config";
import { writeFile } from "fs/promises";
import { generateSoundEffect, writeSoundEffectDebug } from "../lib/elevenlabs.js";
import { config } from "../config.js";
import { parseNamedArgs } from "./cli-utils.js";

const USAGE = `
Usage: npm run generate-sound-effect -- --prompt "<description>" [options]

Options:
  --prompt <text>   Sound effect description (required)
  --duration <sec>  Duration in seconds (0.5-30). Default: 1 for short SFX
  --loop            Generate a seamlessly looping sound (use with --duration 30 for BGM)
  --output <path>   Output file path (default: ./sound-effect.mp3)

Examples:
  # 1s SFX for game item open
  npm run generate-sound-effect -- --prompt "short magical reveal chime" --duration 1 --output open-sfx.mp3

  # 30s looping BGM
  npm run generate-sound-effect -- --prompt "calm ambient background loop" --duration 30 --loop --output bgm.mp3
`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opts = parseNamedArgs(argv);
  const loopFlag = argv.includes("--loop");

  const prompt = opts.prompt;
  if (!prompt) {
    console.error("Error: --prompt is required.");
    console.error(USAGE);
    process.exit(1);
  }

  const durationNum = opts.duration ? parseFloat(opts.duration) : 1;
  const durationSeconds =
    Number.isNaN(durationNum) || durationNum <= 0 ? 1 : Math.min(30, Math.max(0.5, durationNum));
  const outputPath = opts.output ?? "./sound-effect.mp3";

  try {
    console.log("Generating sound effect...");
    const buffer = await generateSoundEffect({
      prompt,
      durationSeconds,
      loop: loopFlag,
      outputFormat: "mp3_44100_128",
    });
    await writeFile(outputPath, buffer);
    console.log("Saved to", outputPath);

    if (config.debug.soundEffect) {
      await writeSoundEffectDebug(buffer, {
        prompt,
        durationSeconds,
        loop: loopFlag,
      });
      console.log("Sound effect debug: wrote to", config.debug.soundEffect);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
