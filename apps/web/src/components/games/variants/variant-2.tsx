/**
 * Variant 2: Header ~25%, bonus+match on same row, lucky-numbers row, your-numbers row.
 */

import type { CardData, LuckyNumbersData, YourNumbersData } from "@repo/shared";
import { ScratchCardHeader } from "../scratch-card-header";
import { GameContainer } from "../game-container";
import { LuckyNumbers } from "../lucky-numbers";
import { YourNumbers } from "../your-numbers";

export interface Variant2Props {
  cardData: CardData;
}

function findGame<T extends { id: string }>(games: { id: string }[], id: string): T | undefined {
  return games.find((g) => g.id === id) as T | undefined;
}

export function Variant2({ cardData }: Variant2Props) {
  const { title, titleImageUrl, variant } = cardData;
  const games = variant?.games ?? [];

  const luckyNumbers = findGame<LuckyNumbersData>(games, "lucky-numbers");
  const yourNumbers = findGame<YourNumbersData>(games, "your-numbers");

  return (
    <>
      {/* Header: ~25% of card height */}
      <div className="h-1/3 min-h-0 flex flex-col justify-center shrink-0 p-6">
        <ScratchCardHeader
          title={title}
          titleImageUrl={titleImageUrl}
          className="w-full h-full"
        />
      </div>

      {/* Games: remaining space, predefined layout */}
      <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-4 p-7 pt-4">
        {/* Row 2: Lucky numbers */}
        {luckyNumbers && (
          <GameContainer surface={cardData.gameContainerSurface}>
            {/* render directly without GameSlot wrapper */}
            <LuckyNumbers data={luckyNumbers} glyphSheet={cardData.glyphSheet} matchHighlightTheme={cardData.matchHighlightTheme} />
          </GameContainer>
        )}

        {/* Row 3: Your numbers */}
        {yourNumbers && (
          <GameContainer surface={cardData.gameContainerSurface}>
            {/* render directly without GameSlot wrapper */}
            <YourNumbers data={yourNumbers} glyphSheet={cardData.glyphSheet} matchHighlightTheme={cardData.matchHighlightTheme} />
          </GameContainer>
        )}
      </div>
    </>
  );
}
