import { motion } from "motion/react";
import type { YourNumbersData } from "@repo/shared";
import { GameItem } from "./game-item";

export interface YourNumbersProps {
  data: YourNumbersData;
}

export function YourNumbers({ data }: YourNumbersProps) {
  const { cols, rows, items } = data;
  const total = cols * rows;
  const visibleItems = items.slice(0, total);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-dim">
        Your Numbers
      </h3>
      <div
        className="grid gap-2 w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {visibleItems.map((item) => (
          <GameItem key={item.id} data={item} size="md" />
        ))}
      </div>
    </motion.section>
  );
}
