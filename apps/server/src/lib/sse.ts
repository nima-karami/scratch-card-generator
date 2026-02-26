import type { Response } from "express";
import type { SSEEvent } from "@repo/shared";
import { SSE_EVENTS } from "@repo/shared";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

/**
 * Set response headers for SSE and send events.
 * Caller should not call res.end() for persistent streams.
 */
export function setSSEHeaders(res: Response): void {
  res.setHeader("Content-Type", SSE_HEADERS["Content-Type"]);
  res.setHeader("Cache-Control", SSE_HEADERS["Cache-Control"]);
  res.setHeader("Connection", SSE_HEADERS["Connection"]);
  res.setHeader("X-Accel-Buffering", SSE_HEADERS["X-Accel-Buffering"]);
  res.flushHeaders?.();
}

/**
 * Send a single SSE event. Event type is used as the SSE event name; data is JSON stringified.
 */
export function sendSSEEvent(res: Response, event: SSEEvent): void {
  const eventType = event.type;
  const data = JSON.stringify(event);
  res.write(`event: ${eventType}\n`);
  res.write(`data: ${data}\n\n`);
}

export { SSE_EVENTS };
