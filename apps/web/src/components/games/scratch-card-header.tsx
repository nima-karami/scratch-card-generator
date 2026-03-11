import { motion } from "motion/react";
import { CardTitle } from "./card-title";

export interface ScratchCardHeaderProps {
  /** Card title */
  title: string;
  /** Optional tagline below the title */
  tagline?: string;
  /** Optional image URL for the title (overrides text) */
  titleImageUrl?: string;
  /** Optional class name for the root */
  className?: string;
}

export function ScratchCardHeader({
  title,
  tagline,
  titleImageUrl,
  className = "",
}: ScratchCardHeaderProps) {
  return (
    <header className={className} data-scratch-card-header>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <CardTitle title={title} imageUrl={titleImageUrl} alt={title} />
      </motion.div>

      {tagline && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="text-text-secondary text-sm mt-2 leading-relaxed"
        >
          {tagline}
        </motion.p>
      )}
    </header>
  );
}
