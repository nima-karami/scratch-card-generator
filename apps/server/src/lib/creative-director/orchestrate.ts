import { existsSync } from "fs";
import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join, resolve, basename } from "path";
import { fileURLToPath } from "url";
import type { ThemeManifest } from "./types.js";
import type { PipelineConfig } from "../../config/creative-director/pipeline-config.js";
import { config } from "../../config/index.js";
import { generateSpritesheet } from "../spritesheet/generate.js";
import type { SpritesheetPromptParams } from "../spritesheet/prompt-builder.js";
import { generateParticleSpritesheet } from "../spritesheet/generate.js";
import { generateTitleImage, generateTwoWordmarkImages, writeTitleImageDebug } from "../title-image.js";
import { validateTitleImageWithLLM } from "../title-image-qa.js";
import { generateWinMessageImage, writeWinMessageImageDebug } from "../win-message-image.js";
import { generateNextButtonImage, writeNextButtonImageDebug } from "../next-button-image.js";
import { generateContainerImage } from "../container-image.js";
import { generateBackground } from "../background.js";
import { generateSoundEffect, writeSoundEffectDebug } from "../elevenlabs.js";
import { generateGlyphSheet } from "../glyph-sheet/generate.js";
import { validateWinMessageWithLLM } from "../win-message-qa.js";

export interface ProgressEvent {
  type: string;
  message?: string;
  index?: number;
  total?: number;
  kind?: string;
  id?: string;
  url?: string;
}

/** Glyph base path: cwd (e.g. apps/server) first, then @repo/server package root (works when cwd is monorepo root). */
function resolveGlyphSheetBasePath(inputPath: string): string {
  const fromCwd = resolve(process.cwd(), inputPath);
  if (existsSync(fromCwd)) return fromCwd;
  const serverPackageRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const relative = inputPath.replace(/^\.\//, "");
  const fromServer = join(serverPackageRoot, relative);
  if (existsSync(fromServer)) return fromServer;
  return fromCwd;
}

export interface ThemeAssetResult {
  gameButtonSpritesheets: string[];
  particleSpritesheet?: string;
  titleImage?: string;
  luckyNumbersHeaderImage?: string;
  yourNumbersHeaderImage?: string;
  winMessageImage?: string;
  nextButtonImage?: string;
  containerBackground?: string;
  backgroundImage?: string;
  videoBackground?: string;
  backgroundMusic?: string;
  revealSound?: string;
  glyphSheet?: string;
  winOverlay?: { overlayColor: string };
}

function defaultKeyframes(
  totalFrames: number,
  subject: string,
  action: string
): { frame: number; description: string }[] {
  const mid = Math.ceil(totalFrames / 2);
  return [
    { frame: 1, description: `Fully intact, whole ${subject}, centered` },
    {
      frame: mid,
      description: `Roughly half-complete — ${action} in progress`,
    },
    {
      frame: totalFrames,
      description: `Completely done — pure empty background, nothing remains`,
    },
  ];
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40);
}

export interface OrchestrateOptions {
  /** When set, saved to outputDir as moodboard.png and passed to all visual asset generators as style reference. */
  moodboard?: Buffer;
  /** When set, asset-ready events are emitted with full URLs (baseUrl + filename) after each asset is written. */
  baseUrl?: string;
}

/**
 * Merges manifest (creative) with config (technical), runs all enabled generators
 * in parallel, writes assets to outputDir, and returns paths. Emits progress via onProgress.
 * Video background runs image-then-video sequentially within its own task.
 * When options.moodboard is provided, it is written to outputDir and used as style reference for all visual generators.
 */
export async function orchestrateThemeAssets(
  manifest: ThemeManifest,
  pipelineConfig: PipelineConfig,
  outputDir: string,
  onProgress?: (event: ProgressEvent) => void,
  options?: OrchestrateOptions
): Promise<ThemeAssetResult> {
  await mkdir(outputDir, { recursive: true });

  const result: ThemeAssetResult = {
    gameButtonSpritesheets: [],
  };

  const { elements } = manifest;
  const { enabled } = pipelineConfig;
  const moodboard = options?.moodboard;
  const baseUrl = options?.baseUrl;

  const emitAssetReady = (path: string, kind: string) => {
    if (baseUrl && onProgress) {
      onProgress({
        type: "asset-ready",
        kind,
        id: kind,
        url: `${baseUrl.replace(/\/$/, "")}/${basename(path)}`,
      });
    }
  };

  if (moodboard) {
    const moodboardPath = join(outputDir, "moodboard.png");
    await writeFile(moodboardPath, moodboard);
  }

  const tasks: Promise<void>[] = [];

  // ---- Game button spritesheets (one task per variant) ----
  if (enabled.gameButtonSpritesheets && elements.gameButtonSpritesheets.length > 0) {
    const total = elements.gameButtonSpritesheets.length;
    result.gameButtonSpritesheets = new Array(total);
    const { canvasWidth, canvasHeight, cols, rows } = pipelineConfig.spritesheet;
    elements.gameButtonSpritesheets.forEach((variant, i) => {
      tasks.push(
        (async () => {
          onProgress?.({
            type: "generating-spritesheet",
            message: `Spritesheet ${variant.id}`,
            index: i + 1,
            total,
          });
          const totalFrames = cols * rows;
          const keyframes = defaultKeyframes(totalFrames, variant.subject, variant.action);
          const params: SpritesheetPromptParams = {
            canvasWidth,
            canvasHeight,
            cols,
            rows,
            subject: variant.subject,
            animationAction: variant.action,
            keyframes,
            visualStyle: variant.visualStyle,
            backgroundColor: "white",
            ...(moodboard && { referenceImage: moodboard }),
          };
          const { transparent } = await generateSpritesheet(params, (ev) => onProgress?.(ev as ProgressEvent));
          const filename = `spritesheet-${slug(variant.id)}.png`;
          const path = join(outputDir, filename);
          await writeFile(path, transparent);
          result.gameButtonSpritesheets[i] = path;
          if (i === 0) emitAssetReady(path, "spritesheet");
        })()
      );
    });
  }

  // ---- Particle spritesheet ----
  if (enabled.particleSpritesheet) {
    tasks.push(
      (async () => {
        onProgress?.({ type: "generating-particles", message: "Particle spritesheet" });
        const { canvasWidth, canvasHeight, cols, rows } = pipelineConfig.particles;
        const { transparent } = await generateParticleSpritesheet({
          canvasWidth,
          canvasHeight,
          cols,
          rows,
          subject: elements.particleSpritesheet.subject,
          visualStyle: elements.particleSpritesheet.visualStyle,
          backgroundColor: "white",
          ...(moodboard && { referenceImage: moodboard }),
        });
        const path = join(outputDir, "particles.png");
        await writeFile(path, transparent);
        result.particleSpritesheet = path;
        emitAssetReady(path, "particles");
      })()
    );
  }

  // ---- Title image ----
  if (enabled.titleImage) {
    tasks.push(
      (async () => {
        onProgress?.({ type: "generating-title", message: "Title image" });
        const debugDir = config.debug.titleImage;
        const titleText = elements.titleImage.text;
        const titleVisualStyle = elements.titleImage.visualStyle;

        const qaEnabled = config.titleImageQa.enabled;
        const maxRetries = config.titleImageQa.maxRetries ?? 2;
        const maxAttempts = qaEnabled ? maxRetries + 1 : 1;

        let bestBuffer: Buffer | null = null;
        let bestConfidence = -1;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const params = {
            text: titleText,
            visualStyle: titleVisualStyle,
            ...(moodboard && { referenceImage: moodboard }),
          };

          const candidateBuffer = await generateTitleImage(params);
          await writeTitleImageDebug(candidateBuffer, params);

          if (!qaEnabled) {
            bestBuffer = candidateBuffer;
            bestConfidence = 1;
            break;
          }

          const qa = await validateTitleImageWithLLM({
            imageBuffer: candidateBuffer,
            expectedTitleText: titleText,
          });

          if (debugDir) {
            const qaLogPath = join(debugDir, "title-image-qa-log.txt");
            // Write attempt QA results to help debug false positives/negatives.
            const issuesJoined = (qa.issues ?? []).join(" | ").replaceAll('"', "'");
            const line = `${new Date().toISOString()}\tattempt=${attempt}/${maxAttempts}\tpassed=${qa.passed}\tconfidence=${qa.confidence}\tissues="${issuesJoined}"\n`;
            await appendFile(qaLogPath, line, "utf-8");
          }

          if (qa.passed) {
            bestBuffer = candidateBuffer;
            bestConfidence = qa.confidence ?? 1;
            break;
          }

          const candidateConfidence = typeof qa.confidence === "number" ? qa.confidence : 0;
          if (candidateConfidence > bestConfidence) {
            bestBuffer = candidateBuffer;
            bestConfidence = candidateConfidence;
          }
        }

        if (!bestBuffer) {
          // Should never happen, but keep behavior predictable.
          throw new Error("Title image QA loop produced no candidates");
        }

        const path = join(outputDir, "title.png");
        await writeFile(path, bestBuffer);
        result.titleImage = path;
        emitAssetReady(path, "titleImage");
      })()
    );
  }

  // ---- Lucky/Your numbers section headers ("Lucky Numbers" + "Your Numbers") ----
  if (enabled.numbersHeaderImages) {
    tasks.push(
      (async () => {
        onProgress?.({ type: "generating-title", message: "Lucky/Your numbers header images" });
        const headerVisualStyle =
          elements.numbersHeaderImage?.visualStyle ?? elements.titleImage.visualStyle;
        const qaEnabled = config.numbersHeaderQa.enabled;
        const maxRetries = config.numbersHeaderQa.maxRetries ?? 2;
        const qaLogPath =
          config.debug.titleImage && qaEnabled ? join(config.debug.titleImage, "numbers-header-qa-log.txt") : undefined;

        // Image 2 for wordmarks: layout-only reference to help keep baseline alignment and spacing consistent.
        const numbersHeaderReferencePath = join(
          dirname(fileURLToPath(import.meta.url)),
          "../../../assets/numbers-header-reference.jpg",
        );
        const layoutReferenceImage = moodboard ? await readFile(numbersHeaderReferencePath) : undefined;

        const { top, bottom } = await generateTwoWordmarkImages(
          {
            topText: "Lucky Numbers",
            bottomText: "Your Numbers",
            visualStyle: headerVisualStyle,
            ...(moodboard && { referenceImage: moodboard, layoutReferenceImage }),
          },
          {
            enabled: qaEnabled,
            maxRetries,
            qaLogPath,
          },
        );

        const luckyPath = join(outputDir, "lucky-numbers-header.png");
        await writeFile(luckyPath, top);
        await writeTitleImageDebug(top, {
          text: "Lucky Numbers",
          visualStyle: headerVisualStyle,
          ...(moodboard && { referenceImage: moodboard }),
        });
        result.luckyNumbersHeaderImage = luckyPath;
        emitAssetReady(luckyPath, "luckyNumbersHeaderImage");

        const yourPath = join(outputDir, "your-numbers-header.png");
        await writeFile(yourPath, bottom);
        await writeTitleImageDebug(bottom, {
          text: "Your Numbers",
          visualStyle: headerVisualStyle,
          ...(moodboard && { referenceImage: moodboard }),
        });
        result.yourNumbersHeaderImage = yourPath;
        emitAssetReady(yourPath, "yourNumbersHeaderImage");
      })(),
    );
  }

  // ---- Win message image ("You Won!") ----
  if (enabled.winMessageImage) {
    tasks.push(
      (async () => {
        onProgress?.({ type: "generating-title", message: "Win message image" });
        const titleText = "You Won!";
        const params = {
          text: "You Won!",
          visualStyle: elements.winMessageImage?.visualStyle ?? elements.titleImage.visualStyle,
          ...(moodboard && { referenceImage: moodboard }),
        };

        const debugDir = config.debug.winMessageImage;
        const qaEnabled = config.winMessageQa.enabled;
        const maxRetries = config.winMessageQa.maxRetries ?? 2;
        const maxAttempts = qaEnabled ? maxRetries + 1 : 1;

        let bestBuffer: Buffer | null = null;
        let bestConfidence = -1;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const candidateBuffer = await generateWinMessageImage(params);

          if (debugDir) {
            await writeWinMessageImageDebug(candidateBuffer, params);
          } else {
            // Still capture at least one debug artifact if configured; no-op otherwise.
            // (writeWinMessageImageDebug already checks config.debug internally, but we bypass it here to keep behavior consistent.)
          }

          if (!qaEnabled) {
            bestBuffer = candidateBuffer;
            bestConfidence = 1;
            break;
          }

          const qa = await validateWinMessageWithLLM({
            imageBuffer: candidateBuffer,
            expectedText: titleText,
          });

          if (debugDir) {
            const qaLogPath = join(debugDir, "win-message-qa-log.txt");
            const issuesJoined = (qa.issues ?? []).join(" | ").replaceAll('"', "'");
            const line = `${new Date().toISOString()}\tattempt=${attempt}/${maxAttempts}\tpassed=${qa.passed}\tconfidence=${qa.confidence}\tissues="${issuesJoined}"\n`;
            await appendFile(qaLogPath, line, "utf-8");
          }

          if (qa.passed) {
            bestBuffer = candidateBuffer;
            bestConfidence = qa.confidence ?? 1;
            break;
          }

          const candidateConfidence = typeof qa.confidence === "number" ? qa.confidence : 0;
          if (candidateConfidence > bestConfidence) {
            bestBuffer = candidateBuffer;
            bestConfidence = candidateConfidence;
          }
        }

        if (!bestBuffer) {
          throw new Error("Win message QA loop produced no candidates");
        }

        const path = join(outputDir, "win-message.png");
        await writeFile(path, bestBuffer);
        await writeWinMessageImageDebug(bestBuffer, params);
        result.winMessageImage = path;
        emitAssetReady(path, "winMessageImage");
      })()
    );
  }

  // ---- Next button wordmark ("Next") ----
  if ((enabled as { nextButtonImage?: boolean }).nextButtonImage) {
    tasks.push(
      (async () => {
        onProgress?.({ type: "generating-title", message: "Next button image" });
        const params = {
          text: "Next",
          visualStyle: elements.nextButtonImage?.visualStyle ?? elements.titleImage.visualStyle,
          ...(moodboard && { referenceImage: moodboard }),
        };
        const buffer = await generateNextButtonImage(params);
        const path = join(outputDir, "next-button.png");
        await writeFile(path, buffer);
        await writeNextButtonImageDebug(buffer, params);
        result.nextButtonImage = path;
        emitAssetReady(path, "nextButtonImage");
      })(),
    );
  }

  // ---- Container background ----
  if (enabled.containerBackground) {
    tasks.push(
      (async () => {
        onProgress?.({ type: "generating-container", message: "Container background" });
        const buffer = await generateContainerImage({
          type: elements.containerBackground.type,
          width: pipelineConfig.container.width,
          height: pipelineConfig.container.height,
          color: elements.containerBackground.color,
          colorEnd: elements.containerBackground.colorEnd,
          pattern: elements.containerBackground.pattern,
          visualStyle: elements.containerBackground.visualStyle,
          ...(moodboard && { referenceImage: moodboard }),
        });
        const path = join(outputDir, "container-bg.png");
        await writeFile(path, buffer);
        result.containerBackground = path;
      })()
    );
  }

  // ---- Glyph sheet ----
  if (enabled.glyphSheet) {
    const inputPath = resolveGlyphSheetBasePath(pipelineConfig.glyphSheet.inputPath);
    if (!existsSync(inputPath)) {
      throw new Error(
        `Glyph sheet base image not found at ${inputPath}. Set pipelineConfig.glyphSheet.inputPath to a valid path.`
      );
    }
    tasks.push(
      (async () => {
        onProgress?.({ type: "generating-glyph-sheet", message: "Glyph sheet" });
        const baseImageBuffer = await readFile(inputPath);
        const { transparent } = await generateGlyphSheet({
          baseImageBuffer,
          visualStyle: elements.glyphSheet.visualStyle,
          cols: pipelineConfig.glyphSheet.cols,
          rows: pipelineConfig.glyphSheet.rows,
        });
        const path = join(outputDir, "glyph-sheet.png");
        await writeFile(path, transparent);
        result.glyphSheet = path;
      })()
    );
  }

  // ---- Sound effects ----
  if (enabled.backgroundMusic) {
    tasks.push(
      (async () => {
        onProgress?.({ type: "generating-bgm", message: "Background music" });
        const params = {
          prompt: elements.backgroundMusic.prompt,
          durationSeconds: pipelineConfig.backgroundMusic.durationSeconds,
          loop: pipelineConfig.backgroundMusic.loop,
        };
        const buffer = await generateSoundEffect(params);
        const path = join(outputDir, "bgm.mp3");
        await writeFile(path, buffer);
        await writeSoundEffectDebug(buffer, params);
        result.backgroundMusic = path;
        // Stream the generated audio URL so the frontend can play per-theme sounds.
        emitAssetReady(path, "backgroundMusic");
      })()
    );
  }
  if (enabled.revealSound) {
    tasks.push(
      (async () => {
        onProgress?.({ type: "generating-reveal-sound", message: "Reveal sound" });
        const params = {
          prompt: elements.revealSound.prompt,
          durationSeconds: pipelineConfig.revealSound.durationSeconds,
        };
        const buffer = await generateSoundEffect(params);
        const path = join(outputDir, "reveal-sfx.mp3");
        await writeFile(path, buffer);
        await writeSoundEffectDebug(buffer, {
          ...params,
          loop: false,
        });
        result.revealSound = path;
        // Stream the generated audio URL so the frontend can play per-theme sounds.
        emitAssetReady(path, "revealSound");
      })()
    );
  }

  // ---- Background (image always; video attempted with fallback) ----
  if (enabled.background) {
    tasks.push(
      (async () => {
        onProgress?.({ type: "generating-background-image", message: "Background image" });
        const { image, video } = await generateBackground({
          visualStyle: elements.videoBackground.visualStyle,
          animationPrompt: elements.videoBackground.animationPrompt,
          mode: pipelineConfig.background.mode,
          durationSeconds: pipelineConfig.background.durationSeconds,
          aspectRatio: pipelineConfig.background.aspectRatio,
          ...(moodboard && { referenceImage: moodboard }),
        });
        const imagePath = join(outputDir, "background.png");
        await writeFile(imagePath, image);
        result.backgroundImage = imagePath;
        emitAssetReady(imagePath, "backgroundImage");
        if (video) {
          onProgress?.({ type: "generating-video", message: "Video background loop" });
          const videoPath = join(outputDir, "video-background.mp4");
          await writeFile(videoPath, video);
          result.videoBackground = videoPath;
          emitAssetReady(videoPath, "backgroundVideo");
        }
      })()
    );
  }

  await Promise.all(tasks);

  // ---- Win overlay (config only) ----
  if (enabled.winOverlay) {
    result.winOverlay = { overlayColor: elements.winOverlay.overlayColor };
  }

  return result;
}
