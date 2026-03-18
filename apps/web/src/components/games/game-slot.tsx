import type { GlyphSheetConfig, ScratchCardGame, MatchHighlightTheme } from "@repo/shared";
import { MatchABunch } from "./match-a-bunch";
import { BonusSpot } from "./bonus-spot";
import { LuckyNumbers } from "./lucky-numbers";
import { YourNumbers } from "./your-numbers";
import { PrizeGrid } from "./prize-grid";

export function GameSlot({
  game,
  glyphSheet,
  matchHighlightTheme,
  foregroundColor,
}: {
  game: ScratchCardGame;
  glyphSheet?: GlyphSheetConfig;
  matchHighlightTheme?: MatchHighlightTheme;
  foregroundColor?: string;
}) {
  switch (game.id) {
    case "match-a-bunch":
      return <MatchABunch data={game} matchHighlightTheme={matchHighlightTheme} foregroundColor={foregroundColor} />;
    case "bonus-spot":
      return <BonusSpot data={game} matchHighlightTheme={matchHighlightTheme} foregroundColor={foregroundColor} />;
    case "lucky-numbers":
      return (
        <LuckyNumbers
          data={game}
          glyphSheet={glyphSheet}
          matchHighlightTheme={matchHighlightTheme}
          foregroundColor={foregroundColor}
        />
      );
    case "your-numbers":
      return (
        <YourNumbers
          data={game}
          glyphSheet={glyphSheet}
          matchHighlightTheme={matchHighlightTheme}
          foregroundColor={foregroundColor}
        />
      );
    case "prize-grid":
      return <PrizeGrid data={game} matchHighlightTheme={matchHighlightTheme} foregroundColor={foregroundColor} />;
    default:
      return null;
  }
}
