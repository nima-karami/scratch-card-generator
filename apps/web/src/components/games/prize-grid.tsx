import { motion } from "motion/react";
import type { GlyphSheetConfig, PrizeGridData, MatchHighlightTheme } from "@repo/shared";
import { GameItem } from "./game-item";

export interface PrizeGridProps {
  data: PrizeGridData;
  /** Optional glyph sheet for rendering item values (from card). */
  glyphSheet?: GlyphSheetConfig;
  matchHighlightTheme?: MatchHighlightTheme;
  /** Semantic foreground color for fallback text rendering inside each tile. */
  foregroundColor?: string;
}

export function PrizeGrid({ data, glyphSheet, matchHighlightTheme, foregroundColor }: PrizeGridProps) {
  const { cols, rows, items, coverSpriteSheet } = data;
  const total = cols * rows;
  const visibleItems = items.slice(0, total);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <div
        className="grid gap-2 w-full place-items-center"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {visibleItems.map((item) => (
          <GameItem
            key={item.id}
            data={item}
            size="lg"
            spriteSheetConfig={coverSpriteSheet}
            glyphSheet={glyphSheet}
            matchHighlightTheme={matchHighlightTheme}
            foregroundColor={foregroundColor}
          />
        ))}
      </div>
    </motion.section>
  );
}
