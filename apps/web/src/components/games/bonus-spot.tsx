import { motion } from "motion/react";
import type { BonusSpotData, MatchHighlightTheme } from "@repo/shared";
import { GameItem } from "./game-item";

export interface BonusSpotProps {
  data: BonusSpotData;
  matchHighlightTheme?: MatchHighlightTheme;
}

export function BonusSpot({ data, matchHighlightTheme }: BonusSpotProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-dim">
        Bonus Spot
      </h3>
      <div className="flex items-center gap-3">
        <GameItem data={data.item} size="lg" matchHighlightTheme={matchHighlightTheme} />
        <span className="text-sm font-medium text-gold">{data.prize}</span>
      </div>
    </motion.section>
  );
}
