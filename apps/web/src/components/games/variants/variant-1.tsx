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
  const { title, titleImageUrl, variant } = cardData;
  const games = variant?.games ?? ([] as ScratchCardGame[]);

  const prizeGrid = games.find((game) => game.id === "prize-grid");
  if (!prizeGrid) {
    return null;
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header: ~20% of card height */}
      <div className="min-h-0 flex flex-col justify-center shrink-0 p-7 pb-4">
        <ScratchCardHeader title={title} titleImageUrl={titleImageUrl} />
      </div>

      {/* Games: remaining space, stacked */}
      <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-4 p-7 pt-4">
        <GameContainer surface={cardData.gameContainerSurface}>
          <PrizeGrid data={prizeGrid} glyphSheet={cardData.glyphSheet} />
        </GameContainer>
      </div>
    </div>
  );
}
