import { useEffect } from "react";
import type { CardData, GameItemData } from "@repo/shared";
import { useScratchCardStore } from "../../stores/scratch-card-store";

export function useMatchEvaluator(cardData: CardData) {
  const itemStates = useScratchCardStore((s) => s.itemStates);
  const setItemState = useScratchCardStore((s) => s.setItemState);
  const roundId = useScratchCardStore((s) => s.roundId);

  useEffect(() => {
    // If a Next round reset happened after this effect was scheduled,
    // prevent stale effects from applying "win" states into the next card.
    if (useScratchCardStore.getState().roundId !== roundId) return;

    const games = cardData.variant?.games ?? [];
    if (games.length === 0) return;

    // We'll collect state updates to avoid multiple renders, though Zustand handles it fairly well.
    const updates = new Map<string, "win">();

    const luckyNumbersGame = games.find((g) => g.id === "lucky-numbers");
    const yourNumbersGame = games.find((g) => g.id === "your-numbers");
    const prizeGridGame = games.find((g) => g.id === "prize-grid");
    const matchABunchGame = games.find((g) => g.id === "match-a-bunch");
    const bonusSpotGame = games.find((g) => g.id === "bonus-spot");

    // 1. Lucky + Your Numbers
    if (luckyNumbersGame && yourNumbersGame) {
      const lnItems = luckyNumbersGame.items.slice(0, luckyNumbersGame.count);
      const ynItems = yourNumbersGame.items.slice(0, yourNumbersGame.cols * yourNumbersGame.rows);

      const openLnItems = lnItems.filter((item) => itemStates[item.id] === "open" || itemStates[item.id] === "win");
      const openYnItems = ynItems.filter((item) => itemStates[item.id] === "open" || itemStates[item.id] === "win");

      for (const yn of openYnItems) {
        // If it's a winning number (valueCents > 0), find its matching lucky number by value
        if ((yn.valueCents ?? 0) > 0) {
          const matchingLn = openLnItems.find((ln) => ln.value === yn.value);
          if (matchingLn) {
            if (itemStates[yn.id] !== "win") updates.set(yn.id, "win");
            if (itemStates[matchingLn.id] !== "win") updates.set(matchingLn.id, "win");
          }
        }
      }
    }

    // 2. Prize Grid (Match 3 of a kind)
    if (prizeGridGame) {
      const pgItems = prizeGridGame.items.slice(0, prizeGridGame.cols * prizeGridGame.rows);
      const openPgItems = pgItems.filter((item) => itemStates[item.id] === "open" || itemStates[item.id] === "win");

      // Group by value
      const valueCounts = new Map<string, GameItemData[]>();
      for (const item of openPgItems) {
        // Only count valid prizes (e.g., > $0)
        const num = parseFloat(item.value.replace(/[^0-9.-]/g, "")) || 0;
        if (num > 0 || (item.valueCents ?? 0) > 0) {
          const group = valueCounts.get(item.value) ?? [];
          group.push(item);
          valueCounts.set(item.value, group);
        }
      }

      // If any group has >= 3 items, they win
      for (const [_, items] of valueCounts.entries()) {
        if (items.length >= 3) {
          for (const item of items) {
            if (itemStates[item.id] !== "win") updates.set(item.id, "win");
          }
        }
      }
    }

    // 3. Match A Bunch
    if (matchABunchGame) {
      const matchCount = Math.max(2, Math.min(5, matchABunchGame.matchCount));
      const mbItems = matchABunchGame.items.slice(0, matchCount);
      const openMbItems = mbItems.filter((item) => itemStates[item.id] === "open" || itemStates[item.id] === "win");

      const valueCounts = new Map<string, GameItemData[]>();
      for (const item of openMbItems) {
        const group = valueCounts.get(item.value) ?? [];
        group.push(item);
        valueCounts.set(item.value, group);
      }

      for (const [_, items] of valueCounts.entries()) {
        if (items.length >= matchCount) {
          for (const item of items) {
            if (itemStates[item.id] !== "win") updates.set(item.id, "win");
          }
        }
      }
    }

    // 4. Bonus Spot
    if (bonusSpotGame) {
      const item = bonusSpotGame.item;
      if (itemStates[item.id] === "open" || itemStates[item.id] === "win") {
        if ((item.valueCents ?? 0) > 0 || (parseFloat(item.value.replace(/[^0-9.-]/g, "")) || 0) > 0) {
          if (itemStates[item.id] !== "win") updates.set(item.id, "win");
        }
      }
    }

    // Apply updates
    if (updates.size > 0) {
      if (useScratchCardStore.getState().roundId !== roundId) return;
      for (const [id, state] of updates.entries()) {
        setItemState(id, state);
      }
    }
  }, [cardData, itemStates, setItemState, roundId]);
}
