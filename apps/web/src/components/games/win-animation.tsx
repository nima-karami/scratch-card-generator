import { motion } from "motion/react";

export interface WinAnimationProps {
  totalWon: string;
  onClose?: () => void;
}

export function WinAnimation({ totalWon, onClose }: WinAnimationProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mx-4 flex max-w-sm flex-col items-center gap-6 rounded-2xl border border-gold/30 bg-surface-raised p-8 shadow-xl"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold-dim font-medium">
          You won!
        </p>
        <p className="font-display text-4xl font-extrabold text-gold-light">
          Total: {totalWon}
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gold/30 bg-surface px-4 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-surface-bright"
          >
            Done
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
