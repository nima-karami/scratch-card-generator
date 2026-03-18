import type { GlyphSheetConfig, ScratchCardGame, MatchHighlightTheme } from "@repo/shared";
import { MatchABunch } from "./match-a-bunch";
import { BonusSpot } from "./bonus-spot";
import { LuckyNumbers } from "./lucky-numbers";
import { YourNumbers } from "./your-numbers";
import { PrizeGrid } from "./prize-grid";

export function GameSlot({ game, glyphSheet, matchHighlightTheme }: { game: ScratchCardGame; glyphSheet?: GlyphSheetConfig; matchHighlightTheme?: MatchHighlightTheme }) {
  switch (game.id) {
    case "match-a-bunch":
      return <MatchABunch data={game} matchHighlightTheme={matchHighlightTheme} />;
    case "bonus-spot":
      return <BonusSpot data={game} matchHighlightTheme={matchHighlightTheme} />;
    case "lucky-numbers":
      return <LuckyNumbers data={game} glyphSheet={glyphSheet} matchHighlightTheme={matchHighlightTheme} />;
    case "your-numbers":
      return <YourNumbers data={game} glyphSheet={glyphSheet} matchHighlightTheme={matchHighlightTheme} />;
    case "prize-grid":
      return <PrizeGrid data={game} matchHighlightTheme={matchHighlightTheme} />;
    default:
      return null;
  }
}
