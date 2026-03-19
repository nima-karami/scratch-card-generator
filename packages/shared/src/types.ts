/** API: POST /api/generate request body */
export interface GenerateRequest {
  prompt: string;
}

/** API: POST /api/generate response */
export interface GenerateResponse {
  jobId: string;
}

/** Slot for a single image on the card */
export interface CardImageSlot {
  id: string;
  url: string;
  alt?: string;
}

/** One revealable cell: cover (image or spritesheet) and value underneath */
export interface GameItemData {
  id: string;
  coverUrl?: string;
  /** Spritesheet image URL; uses game-level config. Takes precedence over coverUrl. */
  coverSpriteSheetSrc?: string;
  value: string;
  revealed: boolean;
  /** Prize value in cents; 0 = miss. Enables isWin = (valueCents ?? 0) > 0 for UI/analytics. */
  valueCents?: number;
}

/** Shared spritesheet config (grid only). Frame size is derived from image dimensions: frameWidth = imageWidth/cols, frameHeight = imageHeight/rows. */
export interface SpriteSheetConfig {
  cols: number;
  rows: number;
}

/** Parameters for spritesheet generation pipeline (prompt construction, image gen, alpha extraction). */
export interface SpritesheetGenerationConfig {
  canvasWidth: number;
  canvasHeight: number;
  cols: number;
  rows: number;
  subject: string;
  animationAction: string;
  keyframes: { frame: number; description: string }[];
  visualStyle: string;
}

/** Match-a-bunch game: 2–5 match items + prize */
export interface MatchABunchData {
  id: "match-a-bunch";
  items: GameItemData[];
  matchCount: number;
  prize: string;
  /** Prize in cents; 0 = miss. */
  prizeCents?: number;
}

/** Bonus spot: single reveal for a prize */
export interface BonusSpotData {
  id: "bonus-spot";
  item: GameItemData;
  prize: string;
  /** Prize in cents; 0 = miss. */
  prizeCents?: number;
}

/** One winning number entry: number + prize. Used for match-to-prize (Your Numbers). */
export interface WinningNumberEntry {
  number: string;
  prize: string;
  prizeCents?: number;
}

/** Lucky numbers: winning list (number + prize). When a Your Numbers cell matches, user wins that prize. */
export interface LuckyNumbersData {
  id: "lucky-numbers";
  /** Display list of winning numbers (each item shows number + prize). Derived from winningNumbers for UI. */
  items: GameItemData[];
  count: number;
  /** Lookup: number -> prize. Used by client when user reveals a Your Numbers cell. */
  winningNumbers: WinningNumberEntry[];
  /** Shared spritesheet config for items with coverSpriteSheetSrc. */
  coverSpriteSheet?: SpriteSheetConfig;
  /** Optional header wordmark image ("Lucky Numbers") generated from theme typography. */
  headerImageUrl?: string;
}

/** Your numbers: grid of revealable items (e.g. 3x3, 3x4, 4x4) */
export interface YourNumbersData {
  id: "your-numbers";
  items: GameItemData[];
  cols: number;
  rows: number;
  /** Shared spritesheet config for items with coverSpriteSheetSrc. */
  coverSpriteSheet?: SpriteSheetConfig;
  /** Optional header wordmark image ("Your Numbers") generated from theme typography. */
  headerImageUrl?: string;
}

/** Prize grid: grid of revealable cells, each shows a prize (no matching) */
export interface PrizeGridData {
  id: "prize-grid";
  items: GameItemData[];
  cols: number;
  rows: number;
  /** Shared spritesheet config for items with coverSpriteSheetSrc; only src differs per item */
  coverSpriteSheet?: SpriteSheetConfig;
}

export type GameId =
  | "prize-grid"
  | "match-a-bunch"
  | "bonus-spot"
  | "lucky-numbers"
  | "your-numbers";

export type ScratchCardGame =
  | PrizeGridData
  | MatchABunchData
  | BonusSpotData
  | LuckyNumbersData
  | YourNumbersData;

/** Defines which games appear on the card and in what order */
export interface ScratchCardVariant {
  id: "variant-1" | "variant-2" | "variant-3";
  name: string;
  games: ScratchCardGame[];
}

/** Theme for the win overlay: overlay color and optional particle spritesheet for confetti */
export interface WinOverlayTheme {
  /** Optional overlay color (e.g. "rgba(0,0,0,0.5)" or theme key). */
  overlayColor?: string;
  /** Optional win message graphic URL (transparent PNG) displayed in the win popup. */
  winMessageImageUrl?: string;
  /** URL of spritesheet image for confetti particles (grid of N variants). */
  particleSpriteSheetUrl?: string;
  /** Spritesheet grid: cols x rows = number of particle variants. */
  particleSpriteSheetCols?: number;
  particleSpriteSheetRows?: number;
}

/** Optional glyph sheet for rendering dollar/numeric values (e.g. themed digits). Grid layout: cols x rows = 12 cells for $ , 0-9. */
export interface GlyphSheetConfig {
  url: string;
  cols: number;
  rows: number;
  /** Fraction of each cell to hide from each edge per axis (0 = full cell). Clamped to [0, 0.5). */
  cellInset?: { x: number; y: number };
}

/** Container corner radius options controlled by the theme manifest. */
export type GameContainerRadius = "none" | "sm" | "md" | "lg";

/** Theme for the match highlight animation */
export interface MatchHighlightTheme {
  color: string;
  glowColor?: string;
  borderRadius: GameContainerRadius;
}

/** Theme-controlled surface styling for the UI panel that wraps game content. */
export interface GameContainerSurfaceTheme {
  backgroundColor: string;
  borderColor: string;
  borderRadius: GameContainerRadius;
  borderThickness: GameContainerRadius;
}

/** Semantic color tokens derived from the theme meta. */
export interface SemanticColorPalette {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
}

/** Final composed card data for the scratch-card layout */
export interface CardData {
  title: string;
  images: CardImageSlot[];
  /** When present, card renders the game variant; otherwise legacy image layout */
  variant?: ScratchCardVariant;
  /** Optional image URL for the card title (when set, header shows this instead of plain title text) */
  titleImageUrl?: string;
  /** Optional image URL for the card background (fallback when video is unavailable or not generated) */
  backgroundImageUrl?: string;
  /** Optional video URL for the card background (when set, used as looped background; otherwise use backgroundImageUrl or default) */
  backgroundVideoUrl?: string;
  /** Optional theme for the win overlay (overlay color, particle spritesheet). */
  winOverlayTheme?: WinOverlayTheme;
  /** Optional glyph sheet for rendering dollar/numeric values on game items. */
  glyphSheet?: GlyphSheetConfig;
  /** Optional themed "Next" button wordmark image URL (transparent PNG). */
  nextButtonImageUrl?: string;
  /** Semantic colors for text/contrast decisions in the UI. */
  colorPalette: SemanticColorPalette;
  /** Theme-controlled surface styling for the wrapper around game content. */
  gameContainerSurface: GameContainerSurfaceTheme;
  /** Optional theme for the match highlight animation */
  matchHighlightTheme?: MatchHighlightTheme;
}

/** Job status for internal/SSE use */
export enum JobStatus {
  Queued = "queued",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
}

/** SSE: text (title) ready */
export interface TextReadyEvent {
  type: "text-ready";
  title: string;
  /** Optional fun copy for UI/logs. */
  message?: string;
}

/** SSE: image generation progress */
export interface ImageProgressEvent {
  type: "image-progress";
  index: number;
  total: number;
  message?: string;
}

/** SSE: single image ready */
export interface ImageReadyEvent {
  type: "image-ready";
  index: number;
  url: string;
  id: string;
}

/** SSE: composing final card */
export interface ComposingEvent {
  type: "composing";
  message?: string;
}

/** SSE: job complete */
export interface CompleteEvent {
  type: "complete";
  jobId: string;
}

/** SSE: error */
export interface ErrorEvent {
  type: "error";
  message: string;
  code?: string;
}

/** SSE: theme design phase (creative director) */
export interface DesigningEvent {
  type: "designing";
  message?: string;
}

/** SSE: asset generation progress (optional index/total for spritesheets) */
export interface GeneratingSpritesheetEvent {
  type: "generating-spritesheet";
  message?: string;
  index?: number;
  total?: number;
}

/** SSE: other asset steps (particles, title, container, glyph, bgm, reveal sound, video) */
export interface GeneratingAssetEvent {
  type:
    | "generating-particles"
    | "generating-title"
    | "generating-container"
    | "generating-glyph-sheet"
    | "generating-bgm"
    | "generating-reveal-sound"
    | "generating-video-image"
    | "generating-video";
  message?: string;
}

/** SSE: card structure / placeholder slots (sent early so frontend can render layout) */
export interface CardStructureEvent {
  type: "card-structure";
  slots: string[];
}

/** SSE: single asset ready (kind + url so frontend can fill slot) */
export interface AssetReadyEvent {
  type: "asset-ready";
  kind: string;
  id: string;
  url: string;
  /** Optional fun copy for the frontend log/UI. */
  message?: string;
}

export type SSEEvent =
  | TextReadyEvent
  | ImageProgressEvent
  | ImageReadyEvent
  | ComposingEvent
  | CompleteEvent
  | ErrorEvent
  | DesigningEvent
  | GeneratingSpritesheetEvent
  | GeneratingAssetEvent
  | CardStructureEvent
  | AssetReadyEvent;
