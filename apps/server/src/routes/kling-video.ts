import type { Request, Response } from "express";
import { klingVideoRequestSchema } from "@repo/shared";
import { generateKlingVideo, getVideoResult } from "../lib/kling.js";
import { rateLimitGenerate } from "../middleware/rateLimit.js";

export async function postKlingVideo(req: Request, res: Response): Promise<void> {
  const parsed = klingVideoRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const { taskId } = await generateKlingVideo({
      prompt: parsed.data.prompt,
      startFrame: parsed.data.startFrame,
      endFrame: parsed.data.endFrame,
      model: parsed.data.model,
      duration: parsed.data.duration,
      aspect_ratio: parsed.data.aspect_ratio,
      mode: parsed.data.mode,
    });
    res.status(202).json({ taskId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Video generation failed";
    res.status(502).json({ error: "Kling API error", message });
  }
}

export async function getKlingVideoStatus(req: Request, res: Response): Promise<void> {
  const taskId = typeof req.params.taskId === "string" ? req.params.taskId : req.params.taskId?.[0];
  if (!taskId) {
    res.status(400).json({ error: "taskId is required" });
    return;
  }

  try {
    const result = await getVideoResult(taskId);
    res.json({
      status: result.status,
      ...(result.videoUrl && { videoUrl: result.videoUrl }),
      ...(result.error && { error: result.error }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get status";
    res.status(502).json({ error: "Kling API error", message });
  }
}

export { rateLimitGenerate as rateLimitKlingVideo };
