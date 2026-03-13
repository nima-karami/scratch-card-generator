import type { CardData, GameItemData } from "@repo/shared";

const COOKIE_SPRITESHEET_1 = "/assets/cookie-shatter.png";
const COOKIE_SPRITESHEET_2 = "/assets/cookie-shatter-2.png";
const APPLE_SPRITESHEET = "/assets/apple-eating.png";
const DINOSAUR_SPRITESHEET = "/assets/dinosaur-dying-3.png";

const TITLE_IMAGE_COOKIES = "/assets/titles/cookies-title.png";

function gameItem(
  id: string,
  value: string,
  revealed = false,
  coverSpriteSheetSrc?: string,
): GameItemData {
  return { id, value, revealed, coverSpriteSheetSrc };
}

export const mockCardPrizeGrid: CardData = {
  title: "Prize Grid",
  tagline: "Win big with this grid",
  images: [],
  titleImageUrl: TITLE_IMAGE_COOKIES,
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
  tagline: "Win big with this grid",
  images: [],
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

export const mockCardPrizeGrid3: CardData = {
  title: "Prize Grid 3",
  tagline: "Win big with this grid",
  images: [],
  titleImageUrl: TITLE_IMAGE_COOKIES,
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

const MOCKS: Record<string, CardData> = {
  prizeGrid1: mockCardPrizeGrid,
  prizeGrid2: mockCardPrizeGrid2,
  prizeGrid3: mockCardPrizeGrid3,
};

export const MOCK_KEYS = Object.keys(MOCKS);

export function getMockCard(key: string): CardData | undefined {
  return MOCKS[key];
}
