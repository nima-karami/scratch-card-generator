import { mkdir, writeFile } from "fs/promises";
import { join, basename } from "path";
import { Worker, Job } from "bullmq";
import { config } from "../config/index.js";
import { createRedisConnection } from "./connection.js";
import { getQueueName } from "./queue.js";
import type { CardData, GameId, SSEEvent, WinOverlayTheme } from "@repo/shared";
import { getGameConfigs } from "../config/games/index.js";
import { DEFAULT_VARIANT_ID, VARIANT_NAMES, getActiveGameIdsForVariant } from "../config/games/active-games-by-variant.js";
import { generateVariantGames } from "../lib/game-outcomes.js";
import { runFullDirector } from "../lib/creative-director/generate-manifest.js";
import { orchestrateThemeAssets } from "../lib/creative-director/orchestrate.js";
import { writeThemeManifestDebug } from "../lib/creative-director/theme-manifest-debug.js";
import { PIPELINE_CONFIG } from "../config/creative-director/pipeline-config.js";
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
export type ProgressCallback = (event: SSEEvent) => void;

/** Step 1 — Creative Director: theme string → Theme Manifest + moodboard (two-step: meta → moodboard → elements). */
async function runDesignStep(
  prompt: string,
  onProgress: ProgressCallback,
  activeGameIds: string[]
): Promise<{ manifest: Awaited<ReturnType<typeof runFullDirector>>["manifest"]; moodboard: Buffer }> {
  onProgress({ type: "designing", message: "Designing your theme..." });
  const { manifest, moodboard } = await runFullDirector(prompt, { activeGameIds, onProgress });
  return { manifest, moodboard };
}

/** Build list of asset slots that will be produced (for card-structure SSE). Exported for status replay. */
export function getAssetSlots(): string[] {
  const slots: string[] = [];
  const { enabled } = PIPELINE_CONFIG;
  if (enabled.titleImage) slots.push("titleImage");
  if (enabled.background) {
    slots.push("backgroundImage");
    slots.push("backgroundVideo");
  }
  if (enabled.gameButtonSpritesheets) slots.push("spritesheet");
  if (enabled.particleSpritesheet) slots.push("particles");
  return slots;
}

/** Step 2 — Generate all enabled assets from manifest + config, using moodboard as style reference. */
async function runAssetStep(
  manifest: Awaited<ReturnType<typeof runFullDirector>>["manifest"],
  moodboard: Buffer,
  outputDir: string,
  baseUrl: string,
  onProgress: ProgressCallback
): Promise<ThemeAssetResult> {
  return orchestrateThemeAssets(manifest, PIPELINE_CONFIG, outputDir, (ev) => {
    onProgress(ev as SSEEvent);
  }, { moodboard, baseUrl });
}

/** Step 3 — Compose final CardData from manifest + asset result + game outcomes. */
function runComposeStep(
  manifest: Awaited<ReturnType<typeof runFullDirector>>["manifest"],
  assetResult: ThemeAssetResult,
  jobId: string,
  baseUrl: string
): CardData {
  const gameConfigs = getGameConfigs();
  const { spritesheet, particles, glyphSheet } = PIPELINE_CONFIG;

  const activeGameIds = getActiveGameIdsForVariant(DEFAULT_VARIANT_ID);
  const fallbackCoverSpriteSheetSrc =
    assetResult.gameButtonSpritesheets.length > 0
      ? `${baseUrl}/${basename(assetResult.gameButtonSpritesheets[0]!)}`
      : undefined;

  const coverSpriteSheetSrcByGameId: Partial<Record<GameId, string>> = {};
  manifest.elements.gameButtonSpritesheets.forEach((variant, i) => {
    const spritesheetPath = assetResult.gameButtonSpritesheets[i];
    if (!spritesheetPath) return;
    const url = `${baseUrl}/${basename(spritesheetPath)}`;
    coverSpriteSheetSrcByGameId[variant.id as GameId] = url;
  });

  // If the director omitted a game id (shouldn't happen), fall back to the first generated spritesheet.
  for (const gameId of activeGameIds) {
    const typedGameId = gameId as GameId;
    if (!coverSpriteSheetSrcByGameId[typedGameId] && fallbackCoverSpriteSheetSrc) {
      coverSpriteSheetSrcByGameId[typedGameId] = fallbackCoverSpriteSheetSrc;
    }
  }

  // Optional section header wordmarks ("Lucky Numbers" / "Your Numbers").
  const headerImageSrcByGameId: Partial<Record<GameId, string>> = {};
  if (assetResult.luckyNumbersHeaderImage) {
    headerImageSrcByGameId["lucky-numbers"] = `${baseUrl}/${basename(assetResult.luckyNumbersHeaderImage)}`;
  }
  if (assetResult.yourNumbersHeaderImage) {
    headerImageSrcByGameId["your-numbers"] = `${baseUrl}/${basename(assetResult.yourNumbersHeaderImage)}`;
  }

  const games = generateVariantGames(DEFAULT_VARIANT_ID, gameConfigs, {
    jobId,
    coverSpriteSheet: { cols: spritesheet.cols, rows: spritesheet.rows },
    coverSpriteSheetSrcByGameId,
    headerImageSrcByGameId,
  });

  const title = manifest.elements.titleImage.text;

  const rawSurface = manifest.elements.gameContainerSurface;
  const gameContainerSurface = {
    backgroundColor: rawSurface.backgroundColor.trim(),
    borderColor: rawSurface.borderColor.trim(),
    borderRadius: rawSurface.borderRadius,
    borderThickness: rawSurface.borderThickness,
  };

  let winOverlayTheme: WinOverlayTheme | undefined;
  if (assetResult.winOverlay || assetResult.winMessageImage) {
    winOverlayTheme = {
      overlayColor: assetResult.winOverlay?.overlayColor,
      winMessageImageUrl: assetResult.winMessageImage
        ? `${baseUrl}/${basename(assetResult.winMessageImage)}`
        : undefined,
      particleSpriteSheetUrl: assetResult.particleSpritesheet
        ? `${baseUrl}/${basename(assetResult.particleSpritesheet)}`
        : undefined,
      particleSpriteSheetCols: particles.cols,
      particleSpriteSheetRows: particles.rows,
    };
  }

  return {
    title,
    images: [],
    colorPalette: manifest.meta.colorPalette,
    titleImageUrl: assetResult.titleImage
      ? `${baseUrl}/${basename(assetResult.titleImage)}`
      : undefined,
    nextButtonImageUrl: assetResult.nextButtonImage
      ? `${baseUrl}/${basename(assetResult.nextButtonImage)}`
      : undefined,
    glyphSheet: assetResult.glyphSheet
      ? {
          url: `${baseUrl}/${basename(assetResult.glyphSheet)}`,
          cols: glyphSheet.cols,
          rows: glyphSheet.rows,
          // Slight edge inset makes the digits look cleaner in the overlay.
          cellInset: { x: 0.25, y: 0.15 },
        }
      : undefined,
    backgroundImageUrl: assetResult.backgroundImage
      ? `${baseUrl}/${basename(assetResult.backgroundImage)}`
      : undefined,
    backgroundVideoUrl: assetResult.videoBackground
      ? `${baseUrl}/${basename(assetResult.videoBackground)}`
      : undefined,
    winOverlayTheme,
    gameContainerSurface,
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
  const activeGameIds = getActiveGameIdsForVariant(DEFAULT_VARIANT_ID);

  // Step 1 — Creative Director (meta → moodboard → elements)
  const { manifest, moodboard } = await runDesignStep(prompt, onProgress, activeGameIds);

  // Persist the theme manifest for a complete debug snapshot.
  await writeFile(join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
  if (config.debug.themeManifest) {
    await writeThemeManifestDebug(manifest, prompt, join(outputDir, "manifest.json"));
  }
  onProgress({
    type: "text-ready",
    title: manifest.elements.titleImage.text,
  });

  onProgress({ type: "card-structure", slots: getAssetSlots() });

  // Step 2 — Generate assets (anchored to moodboard)
  const assetResult = await runAssetStep(manifest, moodboard, outputDir, baseUrl, onProgress);

  // Step 3 — Compose
  onProgress({ type: "composing", message: "Composing your card..." });
  const cardData = runComposeStep(manifest, assetResult, jobId, baseUrl);
  setJobResult(jobId, cardData);

  // Persist the final card snapshot for debugging.
  await writeFile(join(outputDir, "card-data.json"), JSON.stringify(cardData, null, 2), "utf-8");

  onProgress({ type: "complete", jobId });

  return cardData;
}

/** Per-job channel: buffers events until SSE connects, then forwards live. */
interface JobProgressChannel {
  listener: ProgressCallback | null;
  buffer: SSEEvent[];
}

const jobChannels = new Map<string, JobProgressChannel>();

function getOrCreateChannel(jobId: string): JobProgressChannel {
  let ch = jobChannels.get(jobId);
  if (!ch) {
    ch = { listener: null, buffer: [] };
    jobChannels.set(jobId, ch);
  }
  return ch;
}

export function setProgressListener(jobId: string, cb: ProgressCallback): void {
  const ch = getOrCreateChannel(jobId);
  ch.listener = cb;
  for (const event of ch.buffer) {
    cb(event);
  }
  ch.buffer = [];
}

export function clearProgressListener(jobId: string): void {
  jobChannels.delete(jobId);
}

export function getJobOutputsDir(): string {
  return JOB_OUTPUTS_DIR;
}

export function createWorker(): Worker<GenerationJobData, CardData> {
  const worker = new Worker<GenerationJobData, CardData>(
    getQueueName(),
    async (job) => {
      const ch = getOrCreateChannel(job.data.jobId);
      const onProgress: ProgressCallback = (event) => {
        if (ch.listener) {
          ch.listener(event);
        } else {
          ch.buffer.push(event);
        }
      };
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
