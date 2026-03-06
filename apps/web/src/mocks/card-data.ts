import type { CardData, GameItemData } from "@repo/shared";

const COOKIE_SPRITESHEET = "/assets/cookie-shatter.png";

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
  variant: {
    id: "variant-1",
    name: "Variant 1",
    games: [
      {
        id: "prize-grid",
        items: [
          gameItem("p1", "$0", false, COOKIE_SPRITESHEET),
          gameItem("p2", "$5", false, COOKIE_SPRITESHEET),
          gameItem("p3", "$10", false, COOKIE_SPRITESHEET),
          gameItem("p4", "$50", false, COOKIE_SPRITESHEET),
          gameItem("p5", "$20", false, COOKIE_SPRITESHEET),
          gameItem("p6", "$10", false, COOKIE_SPRITESHEET),
          gameItem("p7", "$100", false, COOKIE_SPRITESHEET),
          gameItem("p8", "$5", false, COOKIE_SPRITESHEET),
          gameItem("p9", "$0", false, COOKIE_SPRITESHEET),
          gameItem("p10", "$0", false, COOKIE_SPRITESHEET),
          gameItem("p11", "$0", false, COOKIE_SPRITESHEET),
          gameItem("p12", "$10", false, COOKIE_SPRITESHEET),
          gameItem("p13", "$0", false, COOKIE_SPRITESHEET),
          gameItem("p14", "$5", false, COOKIE_SPRITESHEET),
          gameItem("p15", "$0", false, COOKIE_SPRITESHEET),
        ],
        cols: 3,
        rows: 5,
        coverSpriteSheet: { cols: 4, rows: 3 },
      },
    ],
  },
};

const MOCKS: Record<string, CardData> = {
  prizeGrid: mockCardPrizeGrid,
};

export const MOCK_KEYS = Object.keys(MOCKS);

export function getMockCard(key: string): CardData | undefined {
  return MOCKS[key];
}
