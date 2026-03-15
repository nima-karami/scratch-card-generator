/**
 * Predefined technical parameters and enable/disable toggles for the Creative Director pipeline.
 * The LLM never touches these — they are config-driven only.
 */

export const PIPELINE_CONFIG = {
  /** Which elements to generate. User toggles these on/off. */
  enabled: {
    gameButtonSpritesheets: true,
    particleSpritesheet: true,
    titleImage: true,
    containerBackground: true,
    videoBackground: true,
    backgroundMusic: true,
    revealSound: true,
    glyphSheet: true,
    winOverlay: true,
  },

  /** Technical params for game button spritesheets (generate-spritesheet). */
  spritesheet: {
    canvasWidth: 1024,
    canvasHeight: 768,
    cols: 4,
    rows: 3,
    variantCount: 2,
  },

  /** Technical params for particle spritesheet (generate-particle-spritesheet). */
  particles: {
    canvasWidth: 512,
    canvasHeight: 256,
    cols: 4,
    rows: 2,
  },

  /** Technical params for container background (generate-container-image). */
  container: {
    width: 400,
    height: 300,
  },

  /** Technical params for video background (generate-video-background). */
  video: {
    durationSeconds: 6 as 4 | 6 | 8,
    aspectRatio: "9:16" as const,
  },

  /** Technical params for BGM (generate-sound-effect). */
  backgroundMusic: {
    durationSeconds: 15,
    loop: true,
  },

  /** Technical params for reveal SFX (generate-sound-effect). */
  revealSound: {
    durationSeconds: 1,
  },

  /** Technical params for glyph sheet (generate-glyph-sheet). Requires base image at inputPath. */
  glyphSheet: {
    inputPath: "./base-font.png",
    cols: 12,
    rows: 1,
  },
} as const;

export type PipelineConfig = typeof PIPELINE_CONFIG;
