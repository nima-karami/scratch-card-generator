/**
 * Variant 3: Header ~15%, your-numbers prominent (large), bonus+match in a row at bottom.
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

export interface Variant3Props {
  cardData: CardData;
}

function findGame<T extends ScratchCardGame>(
  games: ScratchCardGame[],
  type: T["type"],
): T | undefined {
  return games.find((g) => g.type === type) as T | undefined;
}

export function Variant3({ cardData }: Variant3Props) {
  const { title, tagline, variant } = cardData;
  const games = variant?.games ?? [];

  const bonusSpot = findGame<BonusSpotData>(games, "bonus-spot");
  const matchABunch = findGame<MatchABunchData>(games, "match-a-bunch");
  const luckyNumbers = findGame<LuckyNumbersData>(games, "lucky-numbers");
  const yourNumbers = findGame<YourNumbersData>(games, "your-numbers");

  return (
    <>
      {/* Header: ~15% of card height */}
      <div className="flex-[0_0_15%] min-h-0 flex flex-col justify-center shrink-0 p-7 pb-2">
        <ScratchCardHeader title={title} tagline={tagline} />
      </div>

      {/* Games: remaining space, your-numbers gets most room */}
      <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-3 p-7 pt-2">
        {/* Your numbers: prominent, takes available space */}
        {yourNumbers && (
          <GameContainer className="flex-1 min-h-0">
            <GameSlot game={yourNumbers} />
          </GameContainer>
        )}

        {/* Row: bonus + match + lucky (if present) */}
        {(bonusSpot || matchABunch || luckyNumbers) && (
          <div className="flex flex-wrap gap-3 items-center shrink-0">
            {bonusSpot && (
              <GameContainer variant="none">
                <GameSlot game={bonusSpot} />
              </GameContainer>
            )}
            {matchABunch && (
              <GameContainer>
                <GameSlot game={matchABunch} />
              </GameContainer>
            )}
            {luckyNumbers && (
              <GameContainer>
                <GameSlot game={luckyNumbers} />
              </GameContainer>
            )}
          </div>
        )}
      </div>
    </>
  );
}
