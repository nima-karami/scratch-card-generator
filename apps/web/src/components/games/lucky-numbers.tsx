import { motion } from "motion/react";
import type { GlyphSheetConfig, LuckyNumbersData, MatchHighlightTheme } from "@repo/shared";
import { GameItem } from "./game-item";

export interface LuckyNumbersProps {
  data: LuckyNumbersData;
  glyphSheet?: GlyphSheetConfig;
  matchHighlightTheme?: MatchHighlightTheme;
  /** Semantic foreground color for fallback text rendering inside each tile. */
  foregroundColor?: string;
}

export function LuckyNumbers({
  data,
  glyphSheet,
  matchHighlightTheme,
  foregroundColor,
}: LuckyNumbersProps) {
  const items = data.items.slice(0, data.count);
  const spriteSheetConfig = data.coverSpriteSheet;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-1"
    >
      <h3 className="flex w-full justify-center text-xs font-semibold uppercase tracking-wider text-gold-dim">
        {data.headerImageUrl ? (
          <div className="flex w-full justify-center items-center p-2">
            <img
              src={data.headerImageUrl}
              alt="Lucky Numbers"
              className="h-6 max-w-full object-contain object-center"
            />
          </div>
        ) : (
          "Lucky Numbers"
        )}
      </h3>
      {/* Center the tiles horizontally and vertically in their wrap grid */}
      <div className="flex flex-wrap gap-2 justify-center items-center">
        {items.map((item) => (
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
