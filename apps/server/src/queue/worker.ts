import { mkdir, readFile, writeFile } from "fs/promises";
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

function parseHexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().toLowerCase();
  const m = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;

  let h = m[1]!;
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/**
 * Blend color a -> b where `t=0` returns a and `t=1` returns b.
 */
function blendHexColors(a: string, b: string, t: number): string {
  const ar = parseHexToRgb(a);
  const br = parseHexToRgb(b);
  if (!ar || !br) return a;
  const tt = Math.max(0, Math.min(1, t));
  return rgbToHex(ar.r * (1 - tt) + br.r * tt, ar.g * (1 - tt) + br.g * tt, ar.b * (1 - tt) + br.b * tt);
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  // WCAG relative luminance using sRGB companding.
  const srgb = (v255: number) => v255 / 255;
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const R = lin(srgb(r));
  const G = lin(srgb(g));
  const B = lin(srgb(b));
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

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

/** Load persisted card from job-outputs/{jobId}/card-data.json (e.g. after server restart). */
export async function loadCardFromDisk(jobId: string): Promise<CardData | null> {
  const path = join(process.cwd(), JOB_OUTPUTS_DIR, jobId, "card-data.json");
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as CardData;
  } catch {
    return null;
  }
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
  // Post-process container surface to respect semantic palette background
  // and avoid harsh contrasts in light themes.
  const palette = manifest.meta.colorPalette;
  const paletteBackground = palette.background.trim();
  const paletteBackgroundRgb = parseHexToRgb(paletteBackground);
  const paletteBackgroundLuma = paletteBackgroundRgb ? relativeLuminance(paletteBackgroundRgb) : null;
  const paletteIsLight = paletteBackgroundLuma != null ? paletteBackgroundLuma >= 0.65 : false;

  const rawBackgroundColor = rawSurface.backgroundColor.trim();
  const rawBorderColor = rawSurface.borderColor.trim();
  const rawBorderThickness = rawSurface.borderThickness;

  // Always prefer semantic palette background when possible.
  const backgroundColor = parseHexToRgb(rawBackgroundColor) && paletteBackgroundRgb ? paletteBackground : rawBackgroundColor;

  let borderColor = rawBorderColor;
  let borderThickness = rawBorderThickness;

  if (paletteIsLight) {
    // Reduce border pop by downgrading thickness and blending border toward the background.
    borderThickness = rawBorderThickness === "lg" || rawBorderThickness === "md" ? "sm" : rawBorderThickness;

    const secondary = palette.secondary.trim();
    const primary = palette.primary.trim();
    const secondaryRgb = parseHexToRgb(secondary);
    const primaryRgb = parseHexToRgb(primary);

    const preferred = secondaryRgb ? secondary : primaryRgb ? primary : rawBorderColor;
    borderColor = blendHexColors(preferred, paletteBackground, 0.55);
  }

  const gameContainerSurface = {
    backgroundColor,
    borderColor,
    borderRadius: rawSurface.borderRadius,
    borderThickness,
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
    // Used by the frontend to render the "match rectangle" glow/border effect.
    matchHighlightTheme: manifest.elements.matchHighlightTheme,
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
