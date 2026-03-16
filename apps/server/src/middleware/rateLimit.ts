import type { Request, Response, NextFunction } from "express";
import { config } from "../config/index.js";

const counts = new Map<string, number>();

function getClientKey(req: Request): string {
  return (req.ip ?? req.socket?.remoteAddress ?? "unknown").trim() || "unknown";
}

/**
 * In-memory rate limiter: max N generations per IP.
 * Returns 429 if over limit.
 */
export function rateLimitGenerate(req: Request, res: Response, next: NextFunction): void {
  const key = getClientKey(req);
  const current = counts.get(key) ?? 0;
  const maxPerUser = config.server.maxGenerationsPerUser;
  if (current >= maxPerUser) {
    res.status(429).json({
      error: "Rate limit reached",
      message: `You can only generate up to ${maxPerUser} cards.`,
    });
    return;
  }
  counts.set(key, current + 1);
  next();
}
