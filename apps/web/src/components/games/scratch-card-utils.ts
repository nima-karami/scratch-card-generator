import type {
  CardData,
  ScratchCardGame,
  PrizeGridData,
  MatchABunchData,
  BonusSpotData,
  LuckyNumbersData,
  YourNumbersData,
} from "@repo/shared";
import type { ScratchItemState } from "../../stores/scratch-card-store";

function getIdsFromPrizeGrid(game: PrizeGridData): string[] {
  const { cols, rows, items } = game;
  const total = cols * rows;
  return items.slice(0, total).map((item) => item.id);
}

function getIdsFromMatchABunch(game: MatchABunchData): string[] {
  const matchCount = Math.max(2, Math.min(5, game.matchCount));
  return game.items.slice(0, matchCount).map((item) => item.id);
}

function getIdsFromBonusSpot(game: BonusSpotData): string[] {
  return [game.item.id];
}

function getIdsFromLuckyNumbers(game: LuckyNumbersData): string[] {
  return game.items.slice(0, game.count).map((item) => item.id);
}

function getIdsFromYourNumbers(game: YourNumbersData): string[] {
  const total = game.cols * game.rows;
  return game.items.slice(0, total).map((item) => item.id);
}

function getIdsFromGame(game: ScratchCardGame): string[] {
  switch (game.id) {
    case "prize-grid":
      return getIdsFromPrizeGrid(game);
    case "match-a-bunch":
      return getIdsFromMatchABunch(game);
    case "bonus-spot":
      return getIdsFromBonusSpot(game);
    case "lucky-numbers":
      return getIdsFromLuckyNumbers(game);
    case "your-numbers":
      return getIdsFromYourNumbers(game);
    default:
      return [];
  }
}

/**
 * Returns all scratchable item IDs for the current card (all items start covered).
 */
export function getScratchableItemIds(cardData: CardData): string[] {
  const games = cardData.variant?.games ?? [];
  return games.flatMap((game) => getIdsFromGame(game));
}

function getItemsWithValues(cardData: CardData): { id: string; value: string; valueCents?: number }[] {
  const games = cardData.variant?.games ?? [];
  return games.flatMap((game) => {
    switch (game.id) {
      case "prize-grid":
        return game.items
          .slice(0, game.cols * game.rows)
          .map((i) => ({ id: i.id, value: i.value, valueCents: i.valueCents }));
      case "match-a-bunch": {
        const n = Math.max(2, Math.min(5, game.matchCount));
        return game.items.slice(0, n).map((i) => ({ id: i.id, value: i.value, valueCents: i.valueCents }));
      }
      case "bonus-spot":
        return [{ id: game.item.id, value: game.item.value, valueCents: game.item.valueCents }];
      case "lucky-numbers":
        return game.items
          .slice(0, game.count)
          .map((i) => ({ id: i.id, value: i.value, valueCents: i.valueCents }));
      case "your-numbers":
        return game.items
          .slice(0, game.cols * game.rows)
          .map((i) => ({ id: i.id, value: i.value, valueCents: i.valueCents }));
      default:
        return [];
    }
  });
}

/**
 * Placeholder: given card data and current item states, return a total-won string.
 * Sums numeric parts of revealed items' values if parseable; otherwise returns "$0".
 */
export function getTotalWonPlaceholder(
  cardData: CardData,
  itemStates: Record<string, ScratchItemState>,
): string {
  const itemsWithValues = getItemsWithValues(cardData);
  let total = 0;
  for (const { id, value, valueCents } of itemsWithValues) {
    if (itemStates[id] === "open" || itemStates[id] === "win") {
      // Variant-2 win rules:
      // - `lucky-numbers` are displayed only; they should not contribute to total.
      // - `your-numbers` contributes based on its assigned prize (`valueCents`), even if the store state
      //   is only "open" (e.g. revealAll() debug helper).
      if (id.startsWith("ln-")) continue;
      if (id.startsWith("yn-")) {
        // valueCents is in cents (e.g. 1000 -> $10)
        total += Math.round((valueCents ?? 0) / 100);
        continue;
      }

      const num = parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
      total += num;
    }
  }
  return `$${total.toFixed(0)}`;
}
