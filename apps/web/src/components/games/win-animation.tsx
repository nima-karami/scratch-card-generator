import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { WinOverlayTheme } from "@repo/shared";
import { WinParticles } from "./win-particles";

const DEFAULT_OVERLAY_COLOR = "rgba(0, 0, 0, 0.5)";
const COUNT_UP_DURATION_MS = 1200;

export interface WinAnimationProps {
  totalWon: string;
  onClose?: () => void;
  /** Theme for overlay color and particle spritesheet. When missing, default overlay only. */
  winOverlayTheme?: WinOverlayTheme | null;
}

function parseAmount(totalWon: string): number {
  const num = parseFloat(totalWon.replace(/[^0-9.-]/g, "")) || 0;
  return Math.max(0, Math.round(num));
}

function formatAmount(value: number, totalWon: string): string {
  const hasDollar = totalWon.includes("$");
  return hasDollar ? `$${value}` : String(value);
}

export function WinAnimation({ totalWon, onClose, winOverlayTheme }: WinAnimationProps) {
  const targetAmount = parseAmount(totalWon);
  const [displayAmount, setDisplayAmount] = useState(0);

  useEffect(() => {
    setDisplayAmount(0);
    if (targetAmount <= 0) return;
    let start: number | null = null;
    let rafId = 0;
    const duration = COUNT_UP_DURATION_MS;
    const step = (t: number) => {
      if (start === null) start = t;
      const elapsed = t - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 2;
      setDisplayAmount(Math.round(eased * targetAmount));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [targetAmount]);

  const overlayColor =
    winOverlayTheme?.overlayColor ?? DEFAULT_OVERLAY_COLOR;
  const hasParticles =
    winOverlayTheme?.particleSpriteSheetUrl &&
    winOverlayTheme.particleSpriteSheetCols != null &&
    winOverlayTheme.particleSpriteSheetRows != null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl"
    >
      {/* Layer 1: Semi-transparent color overlay on the card */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{ backgroundColor: overlayColor }}
        aria-hidden
      />

      {/* Layer 2: Particle canvas (spritesheet-based confetti) */}
      {hasParticles && (
        <WinParticles
          spriteSheetUrl={winOverlayTheme.particleSpriteSheetUrl!}
          cols={winOverlayTheme.particleSpriteSheetCols!}
          rows={winOverlayTheme.particleSpriteSheetRows!}
          className="absolute inset-0 rounded-2xl pointer-events-none"
        />
      )}

      {/* Layer 3: Popup with "Total Win:" and animated amount */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-4 flex max-w-sm flex-col items-center gap-6 rounded-2xl border border-gold/30 bg-surface-raised p-8 shadow-xl"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold-dim font-medium">
          You won!
        </p>
        <p className="font-display text-4xl font-extrabold text-gold-light">
          Total Win: {formatAmount(displayAmount, totalWon)}
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
