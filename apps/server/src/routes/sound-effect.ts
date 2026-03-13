import type { Request, Response } from "express";
import { soundEffectRequestSchema } from "@repo/shared";
import { config } from "../config.js";
import { generateSoundEffect, writeSoundEffectDebug } from "../lib/elevenlabs.js";
import { rateLimitGenerate } from "../middleware/rateLimit.js";

export async function postSoundEffect(req: Request, res: Response): Promise<void> {
  const parsed = soundEffectRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { prompt, type, durationSeconds: explicitDuration, loop: explicitLoop } = parsed.data;
  const durationSeconds =
    type === "sfx" ? 1 : type === "bgm" ? 30 : (explicitDuration ?? 1);
  const loop = type === "bgm" ? true : type === "sfx" ? false : (explicitLoop ?? false);

  try {
    const buffer = await generateSoundEffect({
      text: prompt,
      durationSeconds,
      loop,
      outputFormat: "mp3_44100_128",
    });

    if (config.debug.soundEffect) {
      await writeSoundEffectDebug(buffer, { prompt, durationSeconds, loop });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sound effect generation failed";
    res.status(502).json({ error: "Eleven Labs API error", message });
  }
}

export { rateLimitGenerate as rateLimitSoundEffect };
