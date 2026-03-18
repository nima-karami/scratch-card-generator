import type { CardData, GameItemData, MatchHighlightTheme, WinOverlayTheme } from "@repo/shared";

const COOKIE_SPRITESHEET_1 = "/assets/spritesheets/cookie-shatter.png";
const DINOSAUR_SPRITESHEET = "/assets/spritesheets/dinosaur-dying-3.png";
const COOL_PINEAPPLE_SPRITESHEET = "/assets/spritesheets/cool-pineapple.png";

const TITLE_IMAGE_COOKIES = "/assets/titles/cookies-title.png";
const TITLE_IMAGE_COOL_PINEAPPLE = "/assets/titles/cool-pineapple-title.png";

const WIN_MESSAGE_IMAGE_URL = "/assets/win-messages/you-won.png";
const WIN_MESSAGE_COOL_PINEAPPLE = "/assets/win-messages/cool-pineapple-win-message.png";

const BGM_DEFAULT_SRC = "/assets/sounds/bgm-loop.mp3";
const REVEAL_DEFAULT_SRC = "/assets/sounds/reveal-chime.mp3";
const BGM_COOL_PINEAPPLE_SRC = "/assets/sounds/cool-pineapple-bgm.mp3";
const REVEAL_COOL_PINEAPPLE_SRC = "/assets/sounds/cool-pineapple-reveal-sfx.mp3";

const GLYPH_SHEET_BEACH_PARTY = {
  url: "/assets/glyphs/glyph-beach-party.png",
  cols: 4,
  rows: 3,
  cellInset: { x: 0.25, y: 0.15 },
};

const GLYPH_SHEET_COOL_PINEAPPLE = {
  ...GLYPH_SHEET_BEACH_PARTY,
  url: "/assets/glyphs/glyph-cool-pineapple.png",
};

function gameItem(
  id: string,
  value: string,
  revealed = false,
  coverSpriteSheetSrc?: string,
): GameItemData {
  return { id, value, revealed, coverSpriteSheetSrc };
}

const COOKIE_WIN_OVERLAY_THEME: WinOverlayTheme = {
  overlayColor: "rgba(0, 0, 255, 0.6)",
  // particleSpriteSheetUrl: COOKIE_PARTICLE_SPRITESHEET,
  // particleSpriteSheetCols: 4,
  // particleSpriteSheetRows: 2,
  winMessageImageUrl: WIN_MESSAGE_IMAGE_URL,
};

const COOL_PINEAPPLE_WIN_OVERLAY_THEME: WinOverlayTheme = {
  overlayColor: COOKIE_WIN_OVERLAY_THEME.overlayColor,
  winMessageImageUrl: WIN_MESSAGE_COOL_PINEAPPLE,
};

const COOL_PINEAPPLE_BACKGROUND_IMAGE_URL = "/assets/backgrounds/cool-pineapple-background.png";

export const mockCardPrizeGrid: CardData = {
  title: "Prize Grid",
  images: [],
  titleImageUrl: TITLE_IMAGE_COOKIES,
  winOverlayTheme: COOKIE_WIN_OVERLAY_THEME,
  glyphSheet: GLYPH_SHEET_BEACH_PARTY,
  gameContainerSurface: {
    backgroundColor: "#0B0C10",
    borderColor: "#FF00FF",
    borderRadius: "md",
    borderThickness: "md",
  },
  variant: {
    id: "variant-1",
    name: "Variant 1",
    games: [
      {
        id: "prize-grid",
        items: [
          gameItem("p1", "$0", false, DINOSAUR_SPRITESHEET),
          gameItem("p2", "$5", false, DINOSAUR_SPRITESHEET),
          gameItem("p3", "$10", false, DINOSAUR_SPRITESHEET),
          gameItem("p4", "$50", false, DINOSAUR_SPRITESHEET),
          gameItem("p5", "$20", false, DINOSAUR_SPRITESHEET),
          gameItem("p6", "$10", false, DINOSAUR_SPRITESHEET),
          gameItem("p7", "$0", false, DINOSAUR_SPRITESHEET),
          gameItem("p8", "$0", false, DINOSAUR_SPRITESHEET),
          gameItem("p9", "$0", false, DINOSAUR_SPRITESHEET),
          gameItem("p10", "$0", false, DINOSAUR_SPRITESHEET),
          gameItem("p11", "$0", false, DINOSAUR_SPRITESHEET),
          gameItem("p12", "$0", false, DINOSAUR_SPRITESHEET),
          gameItem("p13", "$0", false, DINOSAUR_SPRITESHEET),
          gameItem("p14", "$0", false, DINOSAUR_SPRITESHEET),
          gameItem("p15", "$0", false, DINOSAUR_SPRITESHEET),
        ],
        cols: 3,
        rows: 5,
        coverSpriteSheet: { cols: 4, rows: 4 },
      },
    ],
  },
};

export const mockCardPrizeGrid2: CardData = {
  title: "Prize Grid 2",
  images: [],
  winOverlayTheme: COOKIE_WIN_OVERLAY_THEME,
  glyphSheet: GLYPH_SHEET_BEACH_PARTY,
  gameContainerSurface: {
    backgroundColor: "#10121A",
    borderColor: "#00FFFF",
    borderRadius: "sm",
    borderThickness: "sm",
  },
  variant: {
    id: "variant-1",
    name: "Variant 1",
    games: [
      {
        id: "prize-grid",
        items: [
          gameItem("p1", "$0", false, COOKIE_SPRITESHEET_1),
          gameItem("p2", "$5", false, COOKIE_SPRITESHEET_1),
          gameItem("p3", "$10", false, COOKIE_SPRITESHEET_1),
          gameItem("p4", "$50", false, COOKIE_SPRITESHEET_1),
          gameItem("p5", "$20", false, COOKIE_SPRITESHEET_1),
          gameItem("p6", "$10", false, COOKIE_SPRITESHEET_1),
        ],
        cols: 3,
        rows: 5,
        coverSpriteSheet: { cols: 4, rows: 3 },
      },
    ],
  },
};

const MOCK_CARD_PRIZE_GRID_3_SPRITESHEET = COOKIE_SPRITESHEET_1;
const LUCKY_NUMBERS_SPRITESHEET = COOL_PINEAPPLE_SPRITESHEET;
const YOUR_NUMBERS_SPRITESHEET = COOL_PINEAPPLE_SPRITESHEET;

const MOCK_MATCH_HIGHLIGHT_THEME: MatchHighlightTheme = {
  color: "#FFD700",
  glowColor: "#FFA500",
  borderRadius: "md",
};

export const mockCardPrizeGrid3: CardData = {
  title: "Prize Grid 3",
  images: [],
  titleImageUrl: TITLE_IMAGE_COOKIES,
  glyphSheet: {
    ...GLYPH_SHEET_BEACH_PARTY,
  },
  gameContainerSurface: {
    backgroundColor: "#0A3D62",
    borderColor: "#FFFF00",
    borderRadius: "lg",
    borderThickness: "lg",
  },
  matchHighlightTheme: MOCK_MATCH_HIGHLIGHT_THEME,
  winOverlayTheme: COOKIE_WIN_OVERLAY_THEME,
  variant: {
    id: "variant-1",
    name: "Variant 1",
    games: [
      {
        id: "prize-grid",
        items: [
          gameItem("p1", "$0", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p2", "$5", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p3", "$10", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p4", "$50", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p5", "$20", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p6", "$10", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p7", "$0", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p8", "$0", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p9", "$0", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p10", "$0", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p11", "$0", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p12", "$0", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p13", "$0", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p14", "$0", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
          gameItem("p15", "$0", false, MOCK_CARD_PRIZE_GRID_3_SPRITESHEET),
        ],
        cols: 3,
        rows: 5,
        coverSpriteSheet: { cols: 4, rows: 3 },
      },
    ],
  },
};

export const mockCardLuckyYour2: CardData = {
  title: "Lucky + Your Numbers",
  images: [],
  titleImageUrl: TITLE_IMAGE_COOL_PINEAPPLE,
  winOverlayTheme: COOL_PINEAPPLE_WIN_OVERLAY_THEME,
  glyphSheet: GLYPH_SHEET_COOL_PINEAPPLE,
  backgroundImageUrl: COOL_PINEAPPLE_BACKGROUND_IMAGE_URL,
  gameContainerSurface: {
    backgroundColor: "#10121A",
    borderColor: "#FF9900",
    borderRadius: "sm",
    borderThickness: "md",
  },
  matchHighlightTheme: {
    color: "#00FFFF",
    glowColor: "#0088FF",
    borderRadius: "md",
  },
  variant: {
    id: "variant-2",
    name: "Variant 2",
    games: [
      {
        id: "lucky-numbers",
        items: [
          { ...gameItem("ln-1", "7", false, LUCKY_NUMBERS_SPRITESHEET), valueCents: 1000 },
          { ...gameItem("ln-2", "13", false, LUCKY_NUMBERS_SPRITESHEET), valueCents: 500 },
          { ...gameItem("ln-3", "42", false, LUCKY_NUMBERS_SPRITESHEET), valueCents: 5000 },
        ],
        count: 3,
        coverSpriteSheet: { cols: 4, rows: 3 },
        winningNumbers: [
          { number: "7", prize: "$10", prizeCents: 1000 },
          { number: "13", prize: "$5", prizeCents: 500 },
          { number: "42", prize: "$50", prizeCents: 5000 },
        ],
      },
      {
        id: "your-numbers",
        cols: 3,
        rows: 3,
        items: [
          { ...gameItem("yn-1", "1", false, YOUR_NUMBERS_SPRITESHEET), valueCents: 0 },
          { ...gameItem("yn-2", "7", false, YOUR_NUMBERS_SPRITESHEET), valueCents: 1000 },
          { ...gameItem("yn-3", "3", false, YOUR_NUMBERS_SPRITESHEET), valueCents: 0 },
          { ...gameItem("yn-4", "13", false, YOUR_NUMBERS_SPRITESHEET), valueCents: 500 },
          { ...gameItem("yn-5", "5", false, YOUR_NUMBERS_SPRITESHEET), valueCents: 0 },
          { ...gameItem("yn-6", "6", false, YOUR_NUMBERS_SPRITESHEET), valueCents: 0 },
          { ...gameItem("yn-7", "8", false, YOUR_NUMBERS_SPRITESHEET), valueCents: 0 },
          { ...gameItem("yn-8", "9", false, YOUR_NUMBERS_SPRITESHEET), valueCents: 0 },
          { ...gameItem("yn-9", "10", false, YOUR_NUMBERS_SPRITESHEET), valueCents: 0 },
        ],
        coverSpriteSheet: { cols: 4, rows: 3 },
      },
    ],
  },
};

const MOCKS: Record<string, CardData> = {
  prizeGrid1: mockCardPrizeGrid,
  prizeGrid2: mockCardPrizeGrid2,
  prizeGrid3: mockCardPrizeGrid3,
  luckyYour2: mockCardLuckyYour2,
};

export const MOCK_KEYS = Object.keys(MOCKS);

export function getMockCard(key: string): CardData | undefined {
  return MOCKS[key];
}

export function getMockAudioAssetUrls(
  key: string,
): { backgroundMusic: string; revealSound: string } | undefined {
  switch (key) {
    case "luckyYour2":
      return { backgroundMusic: BGM_COOL_PINEAPPLE_SRC, revealSound: REVEAL_COOL_PINEAPPLE_SRC };
    case "prizeGrid1":
    case "prizeGrid2":
    case "prizeGrid3":
      return { backgroundMusic: BGM_DEFAULT_SRC, revealSound: REVEAL_DEFAULT_SRC };
    default:
      return undefined;
  }
}
