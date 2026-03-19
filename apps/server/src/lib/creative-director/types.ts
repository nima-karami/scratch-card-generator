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
    colorPalette: z
      .object({
        background: z
          .string()
          .describe("Hex color for dominant backgrounds (e.g. panel/card background)."),
        foreground: z
          .string()
          .describe("Hex color for primary readable foreground (title text, important UI text)."),
        primary: z.string().describe("Hex color for primary accent/control surfaces."),
        secondary: z.string().describe("Hex color for secondary accents and highlights."),
        accent: z.string().describe("Hex color for strongest accent/glow/highlights."),
      })
      .describe("Semantic palette tokens derived from the theme."),
    mood: z.string().describe("e.g. playful, warm, cozy"),
    gameName: z
      .string()
      .describe("Catchy 2–4 word title for the game; alliteration, puns, or wordplay that fits the theme"),
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

const winMessageImageSchema = z.object({
  visualStyle: z
    .string()
    .describe('Typography and visual treatment for the fixed win message wording (e.g. "You Won!")'),
});

const numbersHeaderImageSchema = z.object({
  visualStyle: z.string().describe("Typography and visual treatment for the section header wordmarks (e.g. Lucky Numbers / Your Numbers)."),
});

const nextButtonImageSchema = z.object({
  visualStyle: z
    .string()
    .describe('Typography and visual treatment for the fixed Next button wording ("Next").'),
});

const gameContainerSurfaceSchema = z.object({
  backgroundColor: z
    .string()
    .describe("CSS color string; prefer hex from palette (e.g. #0B0C10)"),
  borderColor: z
    .string()
    .describe("CSS color string; accent color that complements backgroundColor (prefer hex)"),
  borderRadius: z
    .enum(["none", "sm", "md", "lg"])
    .describe('Container corner radius: "none" | "sm" | "md" | "lg"'),
  borderThickness: z
    .enum(["none", "sm", "md", "lg"])
    .describe('Container border thickness: "none" | "sm" | "md" | "lg"'),
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

const matchHighlightThemeSchema = z.object({
  color: z.string().describe("Primary hex color for the match highlight box shadow or border"),
  glowColor: z.string().describe("Secondary hex color for the pulse/glow effect").optional(),
  borderRadius: z
    .enum(["none", "sm", "md", "lg"])
    .describe('Highlight border radius: "none" | "sm" | "md" | "lg"'),
});

/** Schema for Phase 2: element-specific content (after moodboard is generated). */
export const themeManifestElementsSchema = z
  .object({
    gameButtonSpritesheets: z
      .array(gameButtonSpritesheetVariantSchema)
      .describe("Spritesheet variants for game cell reveals"),
    particleSpritesheet: particleSpritesheetSchema,
    titleImage: titleImageSchema,
    // Optional for backwards compatibility with older manifests.
    winMessageImage: winMessageImageSchema.optional(),
    // Optional for backwards compatibility with older manifests.
    numbersHeaderImage: numbersHeaderImageSchema.optional(),
    // Optional for backwards compatibility with older manifests.
    nextButtonImage: nextButtonImageSchema.optional(),
    gameContainerSurface: gameContainerSurfaceSchema,
    matchHighlightTheme: matchHighlightThemeSchema,
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
export type GameContainerSurfaceElement = ThemeManifest["elements"]["gameContainerSurface"];
export type ContainerBackgroundElement = ThemeManifest["elements"]["containerBackground"];
export type VideoBackgroundElement = ThemeManifest["elements"]["videoBackground"];
export type BackgroundMusicElement = ThemeManifest["elements"]["backgroundMusic"];
export type RevealSoundElement = ThemeManifest["elements"]["revealSound"];
export type GlyphSheetElement = ThemeManifest["elements"]["glyphSheet"];
export type WinOverlayElement = ThemeManifest["elements"]["winOverlay"];
export type WinMessageImageElement = ThemeManifest["elements"]["winMessageImage"];
export type NextButtonImageElement = ThemeManifest["elements"]["nextButtonImage"];
