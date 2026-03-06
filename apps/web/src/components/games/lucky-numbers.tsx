import { motion } from "motion/react";
import type { LuckyNumbersData } from "@repo/shared";
import { GameItem } from "./game-item";

export interface LuckyNumbersProps {
  data: LuckyNumbersData;
}

export function LuckyNumbers({ data }: LuckyNumbersProps) {
  const items = data.items.slice(0, data.count);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-dim">
        Lucky Numbers
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <GameItem key={item.id} data={item} size="md" />
        ))}
      </div>
    </motion.section>
  );
}
