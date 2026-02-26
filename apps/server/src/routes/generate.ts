import type { Request, Response } from "express";
import { generateRequestSchema } from "@repo/shared";
import { cardQueue } from "../queue/queue.js";
import { rateLimitGenerate } from "../middleware/rateLimit.js";

const MAX_QUEUE_WAITING = 50;

export async function postGenerate(req: Request, res: Response): Promise<void> {
  const parsed = generateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const waiting = await cardQueue.getWaitingCount();
  if (waiting >= MAX_QUEUE_WAITING) {
    res.status(503).json({
      error: "At capacity",
      message: "We're at capacity. Please try again in a moment.",
    });
    return;
  }

  const jobId = crypto.randomUUID();
  await cardQueue.add("generate", { jobId, prompt: parsed.data.prompt }, { jobId });

  res.status(202).json({ jobId });
}

export { rateLimitGenerate };
