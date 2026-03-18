import type { Request, Response } from "express";
import { cardQueue, queueEvents } from "../queue/queue.js";
import { getJobResult, getAssetSlots, setProgressListener, clearProgressListener } from "../queue/worker.js";
import { setSSEHeaders, sendSSEEvent } from "../lib/sse.js";
import type { SSEEvent } from "@repo/shared";

export async function getStatus(req: Request, res: Response): Promise<void> {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  if (!jobId) {
    res.status(400).json({ error: "Missing jobId" });
    return;
  }

  const job = await cardQueue.getJob(jobId);
  if (!job) {
    res.status(404).json({ error: "Job not found", jobId });
    return;
  }

  const state = await job.getState();
  setSSEHeaders(res);

  if (state === "completed") {
    const card = getJobResult(jobId);
    if (card) {
      sendSSEEvent(res, { type: "text-ready", title: card.title });
      sendSSEEvent(res, { type: "card-structure", slots: getAssetSlots() });
      if (card.titleImageUrl) {
        sendSSEEvent(res, { type: "asset-ready", kind: "titleImage", id: "titleImage", url: card.titleImageUrl });
      }
      if (card.backgroundImageUrl) {
        sendSSEEvent(res, {
          type: "asset-ready",
          kind: "backgroundImage",
          id: "backgroundImage",
          url: card.backgroundImageUrl,
        });
      }
      if (card.backgroundVideoUrl) {
        sendSSEEvent(res, {
          type: "asset-ready",
          kind: "backgroundVideo",
          id: "backgroundVideo",
          url: card.backgroundVideoUrl,
        });
      }
      const firstGame = card.variant?.games?.[0];
      const spritesheetUrl =
        firstGame && "items" in firstGame
          ? firstGame.items?.[0]?.coverSpriteSheetSrc
          : firstGame && "item" in firstGame
            ? firstGame.item?.coverSpriteSheetSrc
            : undefined;
      if (spritesheetUrl) {
        sendSSEEvent(res, { type: "asset-ready", kind: "spritesheet", id: "spritesheet", url: spritesheetUrl });
      }
      if (card.winOverlayTheme?.particleSpriteSheetUrl) {
        sendSSEEvent(res, {
          type: "asset-ready",
          kind: "particles",
          id: "particles",
          url: card.winOverlayTheme.particleSpriteSheetUrl,
        });
      }
      sendSSEEvent(res, { type: "composing", message: "Composing your card..." });
    }
    sendSSEEvent(res, { type: "complete", jobId });
    res.end();
    return;
  }

  if (state === "failed") {
    const err = job.failedReason;
    sendSSEEvent(res, { type: "error", message: err ?? "Job failed" });
    res.end();
    return;
  }

  const sendEvent = (event: SSEEvent) => {
    try {
      sendSSEEvent(res, event);
    } catch {
      clearProgressListener(jobId);
    }
  };
  setProgressListener(jobId, sendEvent);

  req.on("close", () => {
    clearProgressListener(jobId);
  });

  job.waitUntilFinished(queueEvents).then(
    () => {
      sendSSEEvent(res, { type: "complete", jobId });
      clearProgressListener(jobId);
      res.end();
    },
    (err) => {
      sendSSEEvent(res, { type: "error", message: String(err?.message ?? err) });
      clearProgressListener(jobId);
      res.end();
    },
  );
}
