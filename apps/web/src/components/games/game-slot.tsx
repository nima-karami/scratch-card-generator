import type { ScratchCardGame } from "@repo/shared";
import { MatchABunch } from "./match-a-bunch";
import { BonusSpot } from "./bonus-spot";
import { LuckyNumbers } from "./lucky-numbers";
import { YourNumbers } from "./your-numbers";
import { PrizeGrid } from "./prize-grid";

export function GameSlot({ game }: { game: ScratchCardGame }) {
  switch (game.id) {
    case "match-a-bunch":
      return <MatchABunch data={game} />;
    case "bonus-spot":
      return <BonusSpot data={game} />;
    case "lucky-numbers":
      return <LuckyNumbers data={game} />;
    case "your-numbers":
      return <YourNumbers data={game} />;
    case "prize-grid":
      return <PrizeGrid data={game} />;
    default:
      return null;
  }
}
