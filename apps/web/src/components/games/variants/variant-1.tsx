/**
 * Variant 1: Header ~20%, all games stacked vertically.
 */

import type { CardData, ScratchCardGame } from "@repo/shared";
import { ScratchCardHeader } from "../scratch-card-header";
import { GameContainer } from "../game-container";
import { PrizeGrid } from "../prize-grid";

export interface Variant1Props {
  cardData: CardData;
}

export function Variant1({ cardData }: Variant1Props) {
  const { title, tagline, variant } = cardData;
  const games = variant?.games ?? ([] as ScratchCardGame[]);

  const prizeGrid = games.find((game) => game.id === "prize-grid");
  console.log("prizeGrid", prizeGrid);
  if (!prizeGrid) {
    return null;
  }

  return (
    <>
      {/* Header: ~20% of card height */}
      <div className="flex-[0_0_20%] min-h-0 flex flex-col justify-center shrink-0 p-7 pb-4">
        <ScratchCardHeader title={title} tagline={tagline} />
      </div>

      {/* Games: remaining space, stacked */}
      <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-4 p-7 pt-4">
        <GameContainer>
          <PrizeGrid data={prizeGrid} />
        </GameContainer>
      </div>
    </>
  );
}
