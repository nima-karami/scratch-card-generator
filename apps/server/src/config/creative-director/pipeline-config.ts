/**
 * Predefined technical parameters and enable/disable toggles for the Creative Director pipeline.
 * The LLM never touches these — they are config-driven only.
 */
export const PIPELINE_CONFIG = {
  /** Which elements to generate. User toggles these on/off. */
  enabled: {
    gameButtonSpritesheets: true,
    particleSpritesheet: false,
    titleImage: true,
    winMessageImage: true,
    containerBackground: false,
    background: true,
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

  /** Technical params for background (generate-background). Image only for now; video is costly. */
  background: {
    mode: "image" as "image" | "video",
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

  /**
   * Technical params for glyph sheet (generate-glyph-sheet).
   * Base image: $ , 0-9 in cols x rows grid (see apps/server/assets/).
   */
  glyphSheet: {
    inputPath: "./assets/glyphs-roboto-bold.jpg",
    cols: 4,
    rows: 3,
  },
} as const;

export type PipelineConfig = typeof PIPELINE_CONFIG;

