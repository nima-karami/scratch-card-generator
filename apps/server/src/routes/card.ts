import type { Request, Response } from "express";
import { getJobResult } from "../queue/worker.js";

export async function getCard(req: Request, res: Response): Promise<void> {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  if (!jobId) {
    res.status(400).json({ error: "Missing jobId" });
    return;
  }

  const card = getJobResult(jobId);
  if (!card) {
    res.status(404).json({ error: "Card not found", jobId });
    return;
  }

  res.json(card);
}
