import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { CardData } from "@repo/shared";
import { cn } from "../../lib/utils";
import { useScratchCardStore, allRevealedSelector } from "../../stores/scratch-card-store";
import { useGameStore } from "../../stores/game-store";
import { fetchNextCard } from "../../lib/api";
import { getScratchableItemIds, getTotalWonPlaceholder } from "./scratch-card-utils";
import { ScratchCardBackground } from "./scratch-card-background";
import { Variant1, Variant2, Variant3 } from "./variants";
import { WinAnimation } from "./win-animation";
import { useMatchEvaluator } from "./use-match-evaluator";

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
  const jobId = useGameStore((s) => s.jobId);
  const setCard = useGameStore((s) => s.setCard);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [isNextLoading, setIsNextLoading] = useState(false);

  useEffect(() => {
    if (!variant) return;
    setShowWinAnimation(false);
    const ids = getScratchableItemIds(cardData);
    registerItemIds(ids);
    return () => {
      reset();
    };
  }, [cardData, variant, registerItemIds, reset]);

  // Evaluate true-match conditions across games
  useMatchEvaluator(cardData);

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

  const videoUrl = cardData.backgroundVideoUrl ?? (cardData.backgroundImageUrl ? undefined : DEFAULT_BACKGROUND_VIDEO);
  const totalWon = getTotalWonPlaceholder(cardData, itemStates);
  const nextEnabled = Boolean(allRevealed) && !isNextLoading && Boolean(jobId);

  async function handleNext() {
    if (!jobId) return;
    if (!nextEnabled) return;

    setIsNextLoading(true);
    // Reset scratch state immediately so tiles close even before the next card arrives.
    reset();
    setWinDismissed(true);

    try {
      const nextCard = await fetchNextCard(jobId, variant?.id);
      setCard(nextCard);
    } catch (err) {
      console.error("Failed to load next card", err);
    } finally {
      setIsNextLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "relative flex flex-col h-full rounded-2xl border border-gold/30 bg-surface-raised overflow-hidden glow-gold-strong md:rounded-2xl",
        className,
      )}
    >
      <ScratchCardBackground videoUrl={videoUrl} imageUrl={cardData.backgroundImageUrl} />

      <div className="relative z-20 flex flex-col flex-1 min-h-0">
        {variant.id === "variant-1" && <Variant1 cardData={cardData} />}
        {variant.id === "variant-2" && <Variant2 cardData={cardData} />}
        {variant.id === "variant-3" && <Variant3 cardData={cardData} />}
      </div>

      {/* Bottom Next CTA (enabled only after full reveal) */}
      <div className="absolute bottom-0 left-0 right-0 z-40 p-4">
        <div className="rounded-t-2xl border border-gold/20 bg-surface-raised/90 backdrop-blur-sm px-3 py-3">
          <button
            type="button"
            onClick={handleNext}
            disabled={!nextEnabled}
            aria-disabled={!nextEnabled}
            className={cn(
              "w-full rounded-xl border border-gold/30 bg-surface-raised text-gold font-semibold py-3 shadow-lg transition-colors",
              "hover:bg-surface-bright",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {isNextLoading ? "Loading..." : "Next"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showWinAnimation && !winDismissed && (
          <WinAnimation
            totalWon={totalWon}
            onClose={() => setWinDismissed(true)}
            winOverlayTheme={cardData.winOverlayTheme}
            glyphSheet={cardData.glyphSheet}
            foregroundColor={cardData.colorPalette.foreground}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
