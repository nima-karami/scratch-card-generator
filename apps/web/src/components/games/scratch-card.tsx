import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { CardData } from "@repo/shared";
import { cn } from "../../lib/utils";
import { useScratchCardStore, allRevealedSelector } from "../../stores/scratch-card-store";
import { getScratchableItemIds, getTotalWonPlaceholder } from "./scratch-card-utils";
import { ScratchCardBackground } from "./scratch-card-background";
import { Variant1, Variant2, Variant3 } from "./variants";
import { WinAnimation } from "./win-animation";

const DEFAULT_BACKGROUND_VIDEO = "/assets/videos/video-background.mp4";

/** Delay in ms after all items are revealed before showing the win animation overlay. Tune as needed. */
export const WIN_ANIMATION_DELAY_MS = 500;

export interface ScratchCardProps {
  cardData: CardData;
  /** Optional class name for the root element */
  className?: string;
  /** Delay in ms after all items are revealed before showing the win animation. Default: WIN_ANIMATION_DELAY_MS (500). */
  winAnimationDelayMs?: number;
}

export function ScratchCard({
  cardData,
  className = "",
  winAnimationDelayMs = WIN_ANIMATION_DELAY_MS,
}: ScratchCardProps) {
  const { variant } = cardData;
  const registerItemIds = useScratchCardStore((s) => s.registerItemIds);
  const reset = useScratchCardStore((s) => s.reset);
  const allRevealed = useScratchCardStore(allRevealedSelector);
  const itemStates = useScratchCardStore((s) => s.itemStates);
  const winDismissed = useScratchCardStore((s) => s.winDismissed);
  const setWinDismissed = useScratchCardStore((s) => s.setWinDismissed);
  const [showWinAnimation, setShowWinAnimation] = useState(false);

  useEffect(() => {
    if (!variant) return;
    setShowWinAnimation(false);
    const ids = getScratchableItemIds(cardData);
    registerItemIds(ids);
    return () => {
      reset();
    };
  }, [cardData, variant, registerItemIds, reset]);

  // Show win overlay after a short delay once all items are revealed
  useEffect(() => {
    if (!allRevealed) {
      setShowWinAnimation(false);
      return;
    }
    const timer = setTimeout(() => setShowWinAnimation(true), winAnimationDelayMs);
    return () => clearTimeout(timer);
  }, [allRevealed, winAnimationDelayMs]);

  if (!variant) {
    return null;
  }

  const videoUrl = cardData.backgroundVideoUrl ?? DEFAULT_BACKGROUND_VIDEO;
  const totalWon = getTotalWonPlaceholder(cardData, itemStates);

  return (
    <div
      className={cn(
        "relative flex flex-col h-full rounded-2xl border border-gold/30 bg-surface-raised overflow-hidden glow-gold-strong md:rounded-2xl",
        className,
      )}
    >
      <ScratchCardBackground videoUrl={videoUrl} />

      <div className="relative z-20 flex flex-col flex-1 min-h-0">
        {variant.id === "variant-1" && <Variant1 cardData={cardData} />}
        {variant.id === "variant-2" && <Variant2 cardData={cardData} />}
        {variant.id === "variant-3" && <Variant3 cardData={cardData} />}
      </div>

      <AnimatePresence>
        {showWinAnimation && !winDismissed && (
          <WinAnimation totalWon={totalWon} onClose={() => setWinDismissed(true)} />
        )}
      </AnimatePresence>
    </div>
  );
}
