import type { CardData } from "@repo/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface GenerateResult {
  jobId: string;
}

export async function submitPrompt(prompt: string): Promise<GenerateResult> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: prompt.trim() }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export type SSEEvent =
  | { type: "designing"; message?: string }
  | { type: "text-ready"; title: string; tagline: string }
  | { type: "image-progress"; index: number; total: number; message?: string }
  | { type: "image-ready"; index: number; url: string; id: string }
  | { type: "generating-spritesheet"; message?: string; index?: number; total?: number }
  | { type: "generating-particles"; message?: string }
  | { type: "generating-title"; message?: string }
  | { type: "generating-container"; message?: string }
  | { type: "generating-glyph-sheet"; message?: string }
  | { type: "generating-bgm"; message?: string }
  | { type: "generating-reveal-sound"; message?: string }
  | { type: "generating-video-image"; message?: string }
  | { type: "generating-video"; message?: string }
  | { type: "composing"; message?: string }
  | { type: "complete"; jobId: string }
  | { type: "error"; message: string; code?: string };

export function subscribeToStatus(
  jobId: string,
  onEvent: (event: SSEEvent) => void,
  onError?: (err: Error) => void,
): () => void {
  const url = `${API_BASE}/api/status/${jobId}`;
  const es = new EventSource(url);

  const handleData = (e: MessageEvent) => {
    try {
      const data = JSON.parse((e as MessageEvent).data) as SSEEvent;
      onEvent(data);
      if (data.type === "complete" || data.type === "error") {
        es.close();
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const eventNames = [
    "designing",
    "text-ready",
    "image-progress",
    "image-ready",
    "generating-spritesheet",
    "generating-particles",
    "generating-title",
    "generating-container",
    "generating-glyph-sheet",
    "generating-bgm",
    "generating-reveal-sound",
    "generating-video-image",
    "generating-video",
    "composing",
    "complete",
  ];
  for (const name of eventNames) {
    es.addEventListener(name, handleData);
  }
  es.addEventListener("error", () => {
    onError?.(new Error("SSE connection error"));
    es.close();
  });

  return () => es.close();
}

export async function getCard(jobId: string): Promise<CardData> {
  const res = await fetch(`${API_BASE}/api/card/${jobId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}
