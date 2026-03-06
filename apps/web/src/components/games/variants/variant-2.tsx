/**
 * Variant 2: Header ~25%, bonus+match on same row, lucky-numbers row, your-numbers row.
 */

import type {
  CardData,
  BonusSpotData,
  MatchABunchData,
  LuckyNumbersData,
  YourNumbersData,
  ScratchCardGame,
} from "@repo/shared";
import { ScratchCardHeader } from "../scratch-card-header";
import { GameContainer } from "../game-container";
import { GameSlot } from "../game-slot";

export interface Variant2Props {
  cardData: CardData;
}

function findGame<T extends ScratchCardGame>(
  games: ScratchCardGame[],
  type: T["type"],
): T | undefined {
  return games.find((g) => g.type === type) as T | undefined;
}

export function Variant2({ cardData }: Variant2Props) {
  const { title, tagline, variant } = cardData;
  const games = variant?.games ?? [];

  const bonusSpot = findGame<BonusSpotData>(games, "bonus-spot");
  const matchABunch = findGame<MatchABunchData>(games, "match-a-bunch");
  const luckyNumbers = findGame<LuckyNumbersData>(games, "lucky-numbers");
  const yourNumbers = findGame<YourNumbersData>(games, "your-numbers");

  return (
    <>
      {/* Header: ~25% of card height */}
      <div className="flex-[0_0_25%] min-h-0 flex flex-col justify-center shrink-0 p-7 pb-4">
        <ScratchCardHeader title={title} tagline={tagline} />
      </div>

      {/* Games: remaining space, predefined layout */}
      <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-4 p-7 pt-4">
        {/* Row 1: Bonus spot + Match a bunch side by side */}
        <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
          {bonusSpot && (
            <GameContainer className="shrink-0">
              <GameSlot game={bonusSpot} />
            </GameContainer>
          )}
          {matchABunch && (
            <GameContainer>
              <GameSlot game={matchABunch} />
            </GameContainer>
          )}
        </div>

        {/* Row 2: Lucky numbers */}
        {luckyNumbers && (
          <GameContainer>
            <GameSlot game={luckyNumbers} />
          </GameContainer>
        )}

        {/* Row 3: Your numbers */}
        {yourNumbers && (
          <GameContainer>
            <GameSlot game={yourNumbers} />
          </GameContainer>
        )}
      </div>
    </>
  );
}
