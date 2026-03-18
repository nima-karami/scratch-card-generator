import type { CardData, SSEEvent } from "@repo/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** Resolve a path-only asset URL (e.g. from progress.assetUrls) with API_BASE. */
export function resolveAssetUrl(url: string): string {
  if (url.startsWith("/") && API_BASE) {
    return `${API_BASE.replace(/\/$/, "")}${url}`;
  }
  return url;
}

/** Prepend API_BASE to path-only URLs so assets work when API is on a different origin. */
function normalizeCardUrls(card: CardData, base: string): CardData {
  const abs = (url: string | undefined) =>
    url?.startsWith("/") && base ? `${base.replace(/\/$/, "")}${url}` : url;
  const variant = card.variant
    ? {
        ...card.variant,
        games: card.variant.games.map((game) => {
          if ("items" in game) {
            const headerImageUrl = (game as { headerImageUrl?: string }).headerImageUrl;
            return {
              ...game,
              ...(headerImageUrl ? { headerImageUrl: abs(headerImageUrl) } : {}),
              items: game.items.map((item) => ({
                ...item,
                coverUrl: item.coverUrl ? abs(item.coverUrl) : undefined,
                coverSpriteSheetSrc: item.coverSpriteSheetSrc
                  ? abs(item.coverSpriteSheetSrc)
                  : undefined,
              })),
            };
          }
          if ("item" in game) {
            return {
              ...game,
              item: {
                ...game.item,
                coverUrl: game.item.coverUrl ? abs(game.item.coverUrl) : undefined,
                coverSpriteSheetSrc: game.item.coverSpriteSheetSrc
                  ? abs(game.item.coverSpriteSheetSrc)
                  : undefined,
              },
            };
          }
          return game;
        }),
      }
    : undefined;
  return {
    ...card,
    titleImageUrl: abs(card.titleImageUrl),
    backgroundImageUrl: abs(card.backgroundImageUrl),
    backgroundVideoUrl: abs(card.backgroundVideoUrl),
    nextButtonImageUrl: abs(card.nextButtonImageUrl),
    images: card.images.map((img) => ({ ...img, url: abs(img.url) ?? img.url })),
    glyphSheet: card.glyphSheet
      ? { ...card.glyphSheet, url: abs(card.glyphSheet.url) ?? card.glyphSheet.url }
      : undefined,
    winOverlayTheme: card.winOverlayTheme
      ? {
          ...card.winOverlayTheme,
          particleSpriteSheetUrl: abs(card.winOverlayTheme.particleSpriteSheetUrl),
          winMessageImageUrl: abs(card.winOverlayTheme.winMessageImageUrl),
        }
      : undefined,
    variant,
  };
}

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

export type { SSEEvent };

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
    "card-structure",
    "asset-ready",
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
    "error",
  ];
  for (const name of eventNames) {
    es.addEventListener(name, handleData);
  }
  es.addEventListener("error", (e: Event) => {
    const ev = e as MessageEvent;
    if (ev.data == null) {
      onError?.(new Error("SSE connection error"));
    }
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
  const card = (await res.json()) as CardData;
  return normalizeCardUrls(card, API_BASE);
}

export async function fetchNextCard(jobId: string, variantId?: string): Promise<CardData> {
  const res = await fetch(`${API_BASE}/api/next/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(variantId ? { variantId } : {}),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `Request failed: ${res.status}`);
  }
  const card = (await res.json()) as CardData;
  return normalizeCardUrls(card, API_BASE);
}
