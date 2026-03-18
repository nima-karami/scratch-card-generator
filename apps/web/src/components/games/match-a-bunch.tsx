import { motion } from "motion/react";
import type { MatchABunchData, MatchHighlightTheme } from "@repo/shared";
import { GameItem } from "./game-item";

const CLAMP_MATCH = { min: 2, max: 5 };

export interface MatchABunchProps {
  data: MatchABunchData;
  matchHighlightTheme?: MatchHighlightTheme;
  /** Semantic foreground color for text rendering. */
  foregroundColor?: string;
}

export function MatchABunch({ data, matchHighlightTheme, foregroundColor }: MatchABunchProps) {
  const matchCount = Math.max(
    CLAMP_MATCH.min,
    Math.min(CLAMP_MATCH.max, data.matchCount),
  );
  const items = data.items.slice(0, matchCount);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-dim">
        Match {matchCount}
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {items.map((item) => (
          <GameItem
            key={item.id}
            data={item}
            size="md"
            matchHighlightTheme={matchHighlightTheme}
            foregroundColor={foregroundColor}
          />
        ))}
        <span className="text-text-muted text-sm mx-1">→</span>
        <div
          className="rounded-lg border border-gold/20 bg-surface px-2 py-1.5 text-sm font-medium text-gold"
          style={foregroundColor ? { color: foregroundColor } : undefined}
        >
          {data.prize}
        </div>
      </div>
    </motion.section>
  );
}
