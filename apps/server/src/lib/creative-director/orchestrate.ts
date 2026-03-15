import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";
import type { ThemeManifest } from "./types.js";
import type { PipelineConfig } from "./pipeline-config.js";
import { generateSpritesheet } from "../spritesheet/generate.js";
import type { SpritesheetPromptParams } from "../spritesheet/prompt-builder.js";
import { generateParticleSpritesheet } from "../spritesheet/generate.js";
import { generateTitleImage } from "../title-image.js";
import { generateContainerImage } from "../container-image.js";
import {
  generateThemeBackgroundImage,
  generateLoopedVideoBackground,
} from "../veo.js";
import { generateSoundEffect } from "../elevenlabs.js";
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

/**
 * Merges manifest (creative) with config (technical), runs all enabled generators,
 * writes assets to outputDir, and returns paths. Emits progress via onProgress.
 */
export async function orchestrateThemeAssets(
  manifest: ThemeManifest,
  pipelineConfig: PipelineConfig,
  outputDir: string,
  onProgress?: (event: ProgressEvent) => void
): Promise<ThemeAssetResult> {
  await mkdir(outputDir, { recursive: true });

  const result: ThemeAssetResult = {
    gameButtonSpritesheets: [],
  };

  const { elements } = manifest;
  const { enabled } = pipelineConfig;

  // ---- Game button spritesheets ----
  if (enabled.gameButtonSpritesheets && elements.gameButtonSpritesheets.length > 0) {
    const total = elements.gameButtonSpritesheets.length;
    const { canvasWidth, canvasHeight, cols, rows } = pipelineConfig.spritesheet;
    for (let i = 0; i < elements.gameButtonSpritesheets.length; i++) {
      const variant = elements.gameButtonSpritesheets[i]!;
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
      };
      const { transparent } = await generateSpritesheet(params);
      const filename = `spritesheet-${slug(variant.id)}.png`;
      const path = join(outputDir, filename);
      await writeFile(path, transparent);
      result.gameButtonSpritesheets.push(path);
    }
  }

  // ---- Particle spritesheet ----
  if (enabled.particleSpritesheet) {
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
    });
    const path = join(outputDir, "particles.png");
    await writeFile(path, transparent);
    result.particleSpritesheet = path;
  }

  // ---- Title image ----
  if (enabled.titleImage) {
    onProgress?.({ type: "generating-title", message: "Title image" });
    const buffer = await generateTitleImage({
      text: elements.titleImage.text,
      visualStyle: elements.titleImage.visualStyle,
    });
    const path = join(outputDir, "title.png");
    await writeFile(path, buffer);
    result.titleImage = path;
  }

  // ---- Container background ----
  if (enabled.containerBackground) {
    onProgress?.({ type: "generating-container", message: "Container background" });
    const buffer = await generateContainerImage({
      type: elements.containerBackground.type,
      width: pipelineConfig.container.width,
      height: pipelineConfig.container.height,
      color: elements.containerBackground.color,
      colorEnd: elements.containerBackground.colorEnd,
      pattern: elements.containerBackground.pattern,
      visualStyle: elements.containerBackground.visualStyle,
    });
    const path = join(outputDir, "container-bg.png");
    await writeFile(path, buffer);
    result.containerBackground = path;
  }

  // ---- Glyph sheet ----
  if (enabled.glyphSheet) {
    onProgress?.({ type: "generating-glyph-sheet", message: "Glyph sheet" });
    const inputPath = resolve(process.cwd(), pipelineConfig.glyphSheet.inputPath);
    if (!existsSync(inputPath)) {
      throw new Error(
        `Glyph sheet base image not found at ${inputPath}. Set pipelineConfig.glyphSheet.inputPath to a valid path.`
      );
    }
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
  }

  // ---- Sound effects (parallel) ----
  if (enabled.backgroundMusic || enabled.revealSound) {
    const tasks: Promise<void>[] = [];
    if (enabled.backgroundMusic) {
      onProgress?.({ type: "generating-bgm", message: "Background music" });
      tasks.push(
        (async () => {
          const buffer = await generateSoundEffect({
            prompt: elements.backgroundMusic.prompt,
            durationSeconds: pipelineConfig.backgroundMusic.durationSeconds,
            loop: pipelineConfig.backgroundMusic.loop,
          });
          const path = join(outputDir, "bgm.mp3");
          await writeFile(path, buffer);
          result.backgroundMusic = path;
        })()
      );
    }
    if (enabled.revealSound) {
      onProgress?.({ type: "generating-reveal-sound", message: "Reveal sound" });
      tasks.push(
        (async () => {
          const buffer = await generateSoundEffect({
            prompt: elements.revealSound.prompt,
            durationSeconds: pipelineConfig.revealSound.durationSeconds,
          });
          const path = join(outputDir, "reveal-sfx.mp3");
          await writeFile(path, buffer);
          result.revealSound = path;
        })()
      );
    }
    await Promise.all(tasks);
  }

  // ---- Video background (image then video) ----
  if (enabled.videoBackground) {
    onProgress?.({ type: "generating-video-image", message: "Video background image" });
    const frameBuffer = await generateThemeBackgroundImage({
      visualStyle: elements.videoBackground.visualStyle,
      aspectRatio: pipelineConfig.video.aspectRatio,
    });
    onProgress?.({ type: "generating-video", message: "Video background loop" });
    const videoBuffer = await generateLoopedVideoBackground({
      animationPrompt: elements.videoBackground.animationPrompt,
      firstAndLastFrameImage: frameBuffer,
      durationSeconds: pipelineConfig.video.durationSeconds,
      aspectRatio: pipelineConfig.video.aspectRatio,
    });
    const path = join(outputDir, "video-background.mp4");
    await writeFile(path, videoBuffer);
    result.videoBackground = path;
  }

  // ---- Win overlay (config only) ----
  if (enabled.winOverlay) {
    result.winOverlay = { overlayColor: elements.winOverlay.overlayColor };
  }

  return result;
}
