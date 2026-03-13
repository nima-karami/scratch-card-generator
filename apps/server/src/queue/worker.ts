import { Worker, Job } from "bullmq";
import { config } from "../config.js";
import { createRedisConnection } from "./connection.js";
import { getQueueName } from "./queue.js";
import type { CardData } from "@repo/shared";
import { getGameConfigs } from "../config/games/index.js";
import { generateVariantGames } from "../lib/game-outcomes.js";

export interface GenerationJobData {
  jobId: string;
  prompt: string;
}

/** In-memory store for job results (no DB per architecture). Key: jobId. */
const jobResults = new Map<string, CardData>();

export function getJobResult(jobId: string): CardData | undefined {
  return jobResults.get(jobId);
}

export function setJobResult(jobId: string, data: CardData): void {
  jobResults.set(jobId, data);
}

/** Progress callback: (event) => void. Worker will call this to stream SSE. */
export type ProgressCallback = (event: { type: string; [key: string]: unknown }) => void;

/** Stub: Step 1 — AI design (layout, title, tagline, image descriptions) */
async function runDesignStep(
  _prompt: string,
): Promise<{ title: string; tagline: string; layout: string }> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    title: "Instant Win",
    tagline: "Scratch to reveal your prize!",
    layout: "default",
  };
}

/** Stub: Step 2 — Image generation (placeholder URLs) */
async function runImageStep(
  _prompt: string,
  _layout: string,
  onProgress: ProgressCallback,
): Promise<{ id: string; url: string }[]> {
  onProgress({ type: "image-progress", index: 0, total: 2, message: "Generating images..." });
  await new Promise((r) => setTimeout(r, 400));
  onProgress({ type: "image-progress", index: 1, total: 2 });
  await new Promise((r) => setTimeout(r, 400));
  onProgress({
    type: "image-ready",
    index: 0,
    id: "img-1",
    url: "https://placehold.co/200x200?text=Icon+1",
  });
  onProgress({
    type: "image-ready",
    index: 1,
    id: "img-2",
    url: "https://placehold.co/200x200?text=Icon+2",
  });
  return [
    { id: "img-1", url: "https://placehold.co/200x200?text=Icon+1" },
    { id: "img-2", url: "https://placehold.co/200x200?text=Icon+2" },
  ];
}

/** Placeholder title image URL (same asset as web public; client resolves relative to its origin). */
const DEFAULT_TITLE_IMAGE_URL = "/assets/titles/cookies-title.png";

/** Default variant to generate (prize grid only). Can later be driven by request. */
const DEFAULT_VARIANT_ID = "variant-1" as const;
const VARIANT_NAMES: Record<typeof DEFAULT_VARIANT_ID | "variant-2" | "variant-3", string> = {
  "variant-1": "Variant 1",
  "variant-2": "Variant 2",
  "variant-3": "Variant 3",
};

/** Stub: Step 3 — Compose final card data and attach game outcomes from config. */
function runComposeStep(
  design: { title: string; tagline: string; layout: string },
  images: { id: string; url: string }[],
  jobId: string,
): CardData {
  const gameConfigs = getGameConfigs();
  const games = generateVariantGames(DEFAULT_VARIANT_ID, gameConfigs, {
    jobId,
    coverSpriteSheet: { cols: 4, rows: 3 },
    coverSpriteSheetSrc: "/assets/cookie-shatter.png",
  });
  return {
    title: design.title,
    tagline: design.tagline,
    images: images.map((img) => ({ id: img.id, url: img.url })),
    titleImageUrl: DEFAULT_TITLE_IMAGE_URL,
    variant: {
      id: DEFAULT_VARIANT_ID,
      name: VARIANT_NAMES[DEFAULT_VARIANT_ID],
      games,
    },
  };
}

async function processJob(
  job: Job<GenerationJobData>,
  onProgress: ProgressCallback,
): Promise<CardData> {
  const { jobId, prompt } = job.data;

  // Step 1 — Design
  const design = await runDesignStep(prompt);
  onProgress({ type: "text-ready", title: design.title, tagline: design.tagline });

  // Step 2 — Images
  const images = await runImageStep(prompt, design.layout, onProgress);

  // Step 3 — Compose (with game outcomes from config)
  onProgress({ type: "composing", message: "Composing your card..." });
  await new Promise((r) => setTimeout(r, 200));
  const cardData = runComposeStep(design, images, jobId);
  setJobResult(jobId, cardData);
  onProgress({ type: "complete", jobId });

  return cardData;
}

/** Store progress listeners by jobId so the SSE route can receive events */
const progressListeners = new Map<string, ProgressCallback>();

export function setProgressListener(jobId: string, cb: ProgressCallback): void {
  progressListeners.set(jobId, cb);
}

export function clearProgressListener(jobId: string): void {
  progressListeners.delete(jobId);
}

export function getProgressListener(jobId: string): ProgressCallback | undefined {
  return progressListeners.get(jobId);
}

export function createWorker(): Worker<GenerationJobData, CardData> {
  const worker = new Worker<GenerationJobData, CardData>(
    getQueueName(),
    async (job) => {
      const onProgress = getProgressListener(job.data.jobId) ?? (() => {});
      return processJob(job, onProgress);
    },
    {
      connection: createRedisConnection(),
      concurrency: config.queue.concurrency,
    },
  );

  worker.on("completed", (job) => {
    clearProgressListener(job.data.jobId);
  });
  worker.on("failed", (job) => {
    if (job) clearProgressListener(job.data.jobId);
  });

  return worker;
}
