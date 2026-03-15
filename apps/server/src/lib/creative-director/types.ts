import { z } from "zod";

/**
 * Theme Manifest — purely creative content from the Creative Director LLM.
 * No enabled flags (those live in pipeline-config). Every visual element uses visualStyle.
 */

/** Schema for Phase 1: high-level art direction only. */
export const themeManifestMetaSchema = z
  .object({
    themeDescription: z.string().describe("Original user theme input"),
    generatedAt: z.string().describe("Placeholder; overwritten by system with actual generation time"),
    artStyle: z.string().describe("e.g. flat illustration, pixel art, watercolor"),
    colorPalette: z.array(z.string()).describe("3-5 hex colors"),
    mood: z.string().describe("e.g. playful, warm, cozy"),
  })
  .describe("Global creative decisions");

const metaSchema = themeManifestMetaSchema;

const gameButtonSpritesheetVariantSchema = z.object({
  id: z.string().describe("Slug e.g. cookie-crumble"),
  subject: z.string().describe("What is shown"),
  action: z.string().describe("Animation action"),
  visualStyle: z.string().describe("Art style for this asset"),
});

const particleSpritesheetSchema = z.object({
  subject: z.string().describe("Particle subject e.g. small crumbs"),
  visualStyle: z.string(),
});

const titleImageSchema = z.object({
  text: z.string().describe("Title text"),
  visualStyle: z.string(),
});

const containerBackgroundSchema = z.object({
  type: z.enum(["solid", "gradient", "pattern"]),
  color: z.string().describe("Hex color").optional(),
  colorEnd: z.string().describe("Hex for gradient").optional(),
  pattern: z.enum(["dots", "lines", "grid"]).optional(),
  visualStyle: z.string(),
});

const videoBackgroundSchema = z.object({
  visualStyle: z.string().describe("Image style"),
  animationPrompt: z.string().describe("Video motion"),
});

const backgroundMusicSchema = z.object({
  prompt: z.string().describe("BGM description"),
});

const revealSoundSchema = z.object({
  prompt: z.string().describe("Reveal SFX description"),
});

const glyphSheetSchema = z.object({
  visualStyle: z.string(),
});

const winOverlaySchema = z.object({
  overlayColor: z.string().describe("e.g. rgba(44,24,16,0.7)"),
});

/** Schema for Phase 2: element-specific content (after moodboard is generated). */
export const themeManifestElementsSchema = z
  .object({
    gameButtonSpritesheets: z
      .array(gameButtonSpritesheetVariantSchema)
      .describe("Spritesheet variants for game cell reveals"),
    particleSpritesheet: particleSpritesheetSchema,
    titleImage: titleImageSchema,
    containerBackground: containerBackgroundSchema,
    videoBackground: videoBackgroundSchema,
    backgroundMusic: backgroundMusicSchema,
    revealSound: revealSoundSchema,
    glyphSheet: glyphSheetSchema,
    winOverlay: winOverlaySchema,
  })
  .describe("Creative content per element");

const elementsSchema = themeManifestElementsSchema;

export const themeManifestSchema = z.object({
  meta: metaSchema,
  elements: elementsSchema,
});

/**
 * Gemini-native JSON Schema for generateContent responseSchema.
 * Derived from themeManifestSchema so the LLM output shape stays in sync.
 */
export const THEME_MANIFEST_RESPONSE_SCHEMA = z.toJSONSchema(themeManifestSchema, {
  io: "input",
});

/** For Phase 1: meta-only response. */
export const THEME_MANIFEST_META_RESPONSE_SCHEMA = z.toJSONSchema(themeManifestMetaSchema, {
  io: "input",
});

/** For Phase 2: elements-only response (with moodboard context). */
export const THEME_MANIFEST_ELEMENTS_RESPONSE_SCHEMA = z.toJSONSchema(themeManifestElementsSchema, {
  io: "input",
});

export type ThemeManifest = z.infer<typeof themeManifestSchema>;
export type ThemeManifestMeta = z.infer<typeof themeManifestMetaSchema>;
export type ThemeManifestElements = z.infer<typeof themeManifestElementsSchema>;
export type GameButtonSpritesheetVariant = ThemeManifest["elements"]["gameButtonSpritesheets"][number];
export type ParticleSpritesheetElement = ThemeManifest["elements"]["particleSpritesheet"];
export type TitleImageElement = ThemeManifest["elements"]["titleImage"];
export type ContainerBackgroundElement = ThemeManifest["elements"]["containerBackground"];
export type VideoBackgroundElement = ThemeManifest["elements"]["videoBackground"];
export type BackgroundMusicElement = ThemeManifest["elements"]["backgroundMusic"];
export type RevealSoundElement = ThemeManifest["elements"]["revealSound"];
export type GlyphSheetElement = ThemeManifest["elements"]["glyphSheet"];
export type WinOverlayElement = ThemeManifest["elements"]["winOverlay"];
