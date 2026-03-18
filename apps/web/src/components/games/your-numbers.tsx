import { motion } from "motion/react";
import type { GlyphSheetConfig, YourNumbersData, MatchHighlightTheme } from "@repo/shared";
import { GameItem } from "./game-item";

export interface YourNumbersProps {
  data: YourNumbersData;
  glyphSheet?: GlyphSheetConfig;
  matchHighlightTheme?: MatchHighlightTheme;
  /** Semantic foreground color for fallback text rendering inside each tile. */
  foregroundColor?: string;
}

export function YourNumbers({ data, glyphSheet, matchHighlightTheme, foregroundColor }: YourNumbersProps) {
  const { cols, rows, items } = data;
  const total = cols * rows;
  const visibleItems = items.slice(0, total);
  const spriteSheetConfig = data.coverSpriteSheet;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-dim">Your Numbers</h3>
      <div
        className="grid w-full place-items-center"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {visibleItems.map((item) => (
          <GameItem
            key={item.id}
            data={item}
            size="lg"
            spriteSheetConfig={spriteSheetConfig}
            glyphSheet={glyphSheet}
            matchHighlightTheme={matchHighlightTheme}
            foregroundColor={foregroundColor}
          />
        ))}
      </div>
    </motion.section>
  );
}
