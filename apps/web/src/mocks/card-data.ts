import type { CardData, GameItemData } from "@repo/shared";

function gameItem(id: string, value: string, revealed = false): GameItemData {
  return { id, value, revealed };
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
          gameItem("p1", "WIN"),
          gameItem("p2", "$5"),
          gameItem("p3", "FREE"),
          gameItem("p4", "BONUS"),
          gameItem("p5", "WIN"),
          gameItem("p6", "$10"),
          gameItem("p7", "WIN"),
          gameItem("p8", "$5"),
          gameItem("p9", "FREE"),
          gameItem("p10", "BONUS"),
          gameItem("p11", "WIN"),
          gameItem("p12", "$10"),
          gameItem("p13", "WIN"),
          gameItem("p14", "$5"),
          gameItem("p15", "FREE"),
        ],
        cols: 3,
        rows: 5,
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
