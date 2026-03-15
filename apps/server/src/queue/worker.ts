import { mkdir } from "fs/promises";
import { join } from "path";
import { basename } from "path";
import { Worker, Job } from "bullmq";
import { config } from "../config.js";
import { createRedisConnection } from "./connection.js";
import { getQueueName } from "./queue.js";
import type { CardData, WinOverlayTheme } from "@repo/shared";
import { getGameConfigs } from "../config/games/index.js";
import { generateVariantGames } from "../lib/game-outcomes.js";
import { runFullDirector } from "../lib/creative-director/generate-manifest.js";
import { orchestrateThemeAssets } from "../lib/creative-director/orchestrate.js";
import { PIPELINE_CONFIG } from "../lib/creative-director/pipeline-config.js";
import type { ThemeAssetResult } from "../lib/creative-director/orchestrate.js";

export interface GenerationJobData {
  jobId: string;
  prompt: string;
}

/** In-memory store for job results (no DB per architecture). Key: jobId. */
const jobResults = new Map<string, CardData>();

/** Base directory for job asset outputs. Served at /api/jobs/:jobId/assets/ */
const JOB_OUTPUTS_DIR = "job-outputs";

export function getJobResult(jobId: string): CardData | undefined {
  return jobResults.get(jobId);
}

export function setJobResult(jobId: string, data: CardData): void {
  jobResults.set(jobId, data);
}

/** Progress callback: (event) => void. Worker will call this to stream SSE. */
export type ProgressCallback = (event: { type: string; [key: string]: unknown }) => void;

/** Step 1 — Creative Director: theme string → Theme Manifest + moodboard (two-step: meta → moodboard → elements). */
async function runDesignStep(
  prompt: string,
  onProgress: ProgressCallback
): Promise<{ manifest: Awaited<ReturnType<typeof runFullDirector>>["manifest"]; moodboard: Buffer }> {
  onProgress({ type: "designing", message: "Designing your theme..." });
  const { manifest, moodboard } = await runFullDirector(prompt);
  return { manifest, moodboard };
}

/** Step 2 — Generate all enabled assets from manifest + config, using moodboard as style reference. */
async function runAssetStep(
  manifest: Awaited<ReturnType<typeof runFullDirector>>["manifest"],
  moodboard: Buffer,
  outputDir: string,
  onProgress: ProgressCallback
): Promise<ThemeAssetResult> {
  return orchestrateThemeAssets(manifest, PIPELINE_CONFIG, outputDir, (ev) => {
    onProgress({
      type: ev.type,
      message: ev.message,
      index: ev.index,
      total: ev.total,
    });
  }, { moodboard });
}

/** Default variant to generate (prize grid only). Can later be driven by request. */
const DEFAULT_VARIANT_ID = "variant-1" as const;
const VARIANT_NAMES: Record<typeof DEFAULT_VARIANT_ID | "variant-2" | "variant-3", string> = {
  "variant-1": "Variant 1",
  "variant-2": "Variant 2",
  "variant-3": "Variant 3",
};

/** Step 3 — Compose final CardData from manifest + asset result + game outcomes. */
function runComposeStep(
  manifest: Awaited<ReturnType<typeof runFullDirector>>["manifest"],
  assetResult: ThemeAssetResult,
  jobId: string,
  baseUrl: string
): CardData {
  const gameConfigs = getGameConfigs();
  const { spritesheet, particles } = PIPELINE_CONFIG;

  const coverSpriteSheetSrc =
    assetResult.gameButtonSpritesheets.length > 0
      ? `${baseUrl}/${basename(assetResult.gameButtonSpritesheets[0]!)}`
      : undefined;

  const games = generateVariantGames(DEFAULT_VARIANT_ID, gameConfigs, {
    jobId,
    coverSpriteSheet: { cols: spritesheet.cols, rows: spritesheet.rows },
    coverSpriteSheetSrc,
  });

  const title = manifest.elements.titleImage.text;
  const tagline = `${manifest.meta.mood} — Scratch to reveal your prize!`;

  let winOverlayTheme: WinOverlayTheme | undefined;
  if (assetResult.winOverlay) {
    winOverlayTheme = {
      overlayColor: assetResult.winOverlay.overlayColor,
      particleSpriteSheetUrl: assetResult.particleSpritesheet
        ? `${baseUrl}/${basename(assetResult.particleSpritesheet)}`
        : undefined,
      particleSpriteSheetCols: particles.cols,
      particleSpriteSheetRows: particles.rows,
    };
  }

  return {
    title,
    tagline,
    images: [],
    titleImageUrl: assetResult.titleImage
      ? `${baseUrl}/${basename(assetResult.titleImage)}`
      : undefined,
    backgroundImageUrl: assetResult.backgroundImage
      ? `${baseUrl}/${basename(assetResult.backgroundImage)}`
      : undefined,
    backgroundVideoUrl: assetResult.videoBackground
      ? `${baseUrl}/${basename(assetResult.videoBackground)}`
      : undefined,
    winOverlayTheme,
    variant: {
      id: DEFAULT_VARIANT_ID,
      name: VARIANT_NAMES[DEFAULT_VARIANT_ID],
      games,
    },
  };
}

async function processJob(
  job: Job<GenerationJobData>,
  onProgress: ProgressCallback
): Promise<CardData> {
  const { jobId, prompt } = job.data;

  const outputDir = join(process.cwd(), JOB_OUTPUTS_DIR, jobId);
  await mkdir(outputDir, { recursive: true });

  const baseUrl = `/api/jobs/${jobId}/assets`;

  // Step 1 — Creative Director (meta → moodboard → elements)
  const { manifest, moodboard } = await runDesignStep(prompt, onProgress);
  onProgress({
    type: "text-ready",
    title: manifest.elements.titleImage.text,
    tagline: `${manifest.meta.mood} — Scratch to reveal your prize!`,
  });

  // Step 2 — Generate assets (anchored to moodboard)
  const assetResult = await runAssetStep(manifest, moodboard, outputDir, onProgress);

  // Step 3 — Compose
  onProgress({ type: "composing", message: "Composing your card..." });
  const cardData = runComposeStep(manifest, assetResult, jobId, baseUrl);
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

export function getJobOutputsDir(): string {
  return JOB_OUTPUTS_DIR;
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
    }
  );

  worker.on("completed", (job) => {
    clearProgressListener(job.data.jobId);
  });
  worker.on("failed", (job) => {
    if (job) clearProgressListener(job.data.jobId);
  });

  return worker;
}
