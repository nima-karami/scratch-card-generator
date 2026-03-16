import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";
import type { ThemeManifest } from "./types.js";
import type { PipelineConfig } from "./pipeline-config.js";
import { generateSpritesheet } from "../spritesheet/generate.js";
import type { SpritesheetPromptParams } from "../spritesheet/prompt-builder.js";
import { generateParticleSpritesheet } from "../spritesheet/generate.js";
import { generateTitleImage, writeTitleImageDebug } from "../title-image.js";
import { generateContainerImage } from "../container-image.js";
import { generateBackground } from "../background.js";
import { generateSoundEffect, writeSoundEffectDebug } from "../elevenlabs.js";
import { generateGlyphSheet } from "../glyph-sheet/generate.js";

export interface ProgressEvent {
  type: string;
  message?: string;
  index?: number;
  total?: number;
}

export interface ThemeAssetResult {
  gameButtonSpritesheets: string[];
  particleSpritesheet?: string;
  titleImage?: string;
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
          const { transparent } = await generateSpritesheet(params);
          const filename = `spritesheet-${slug(variant.id)}.png`;
          const path = join(outputDir, filename);
          await writeFile(path, transparent);
          result.gameButtonSpritesheets[i] = path;
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
      })()
    );
  }

  // ---- Title image ----
  if (enabled.titleImage) {
    tasks.push(
      (async () => {
        onProgress?.({ type: "generating-title", message: "Title image" });
        const params = {
          text: elements.titleImage.text,
          visualStyle: elements.titleImage.visualStyle,
          ...(moodboard && { referenceImage: moodboard }),
        };
        const buffer = await generateTitleImage(params);
        const path = join(outputDir, "title.png");
        await writeFile(path, buffer);
        await writeTitleImageDebug(buffer, params);
        result.titleImage = path;
      })()
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
    const inputPath = resolve(process.cwd(), pipelineConfig.glyphSheet.inputPath);
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
        if (video) {
          onProgress?.({ type: "generating-video", message: "Video background loop" });
          const videoPath = join(outputDir, "video-background.mp4");
          await writeFile(videoPath, video);
          result.videoBackground = videoPath;
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
