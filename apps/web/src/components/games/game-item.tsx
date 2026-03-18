import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GameItemData, GlyphSheetConfig } from "@repo/shared";
import { useSoundStore } from "../../stores/sound-store";
import { useScratchCardStore } from "../../stores/scratch-card-store";
import { cn } from "../../lib/utils";
import { SpriteSheetRenderer } from "./sprite-sheet-renderer";
import { GlyphValueDisplay } from "./glyph-value-display";

export type GameItemSize = "sm" | "md" | "lg";

const sizeClasses: Record<GameItemSize, string> = {
  sm: "w-10 h-10 text-xs",
  md: "w-14 h-14 text-sm",
  lg: "w-18 h-18 text-base",
};

export interface GameItemProps {
  data: GameItemData;
  size?: GameItemSize;
  onReveal?: (id: string) => void;
  /** Spritesheet config when item uses coverSpriteSheetSrc (e.g. from PrizeGridData). Frame size is derived from image. */
  spriteSheetConfig?: { cols: number; rows: number };
  /** Optional glyph sheet for rendering the value (e.g. themed digits). When set, value is drawn from the sheet; otherwise plain text. */
  glyphSheet?: GlyphSheetConfig;
}

export function GameItem({
  data,
  size = "md",
  onReveal,
  spriteSheetConfig,
  glyphSheet,
}: GameItemProps) {
  const playRevealSound = useSoundStore((s) => s.playRevealSound);
  const [localRevealed, setLocalRevealed] = useState(false);
  const [isPlayingRevealAnimation, setIsPlayingRevealAnimation] = useState(false);

  const registeredIds = useScratchCardStore((s) => s.registeredIds);
  const storeItemState = useScratchCardStore((s) => s.itemStates[data.id] ?? "closed");
  const setItemState = useScratchCardStore((s) => s.setItemState);
  const isOnScratchCard =
    registeredIds !== null && registeredIds.size > 0 && registeredIds.has(data.id);
  const revealed = isOnScratchCard ? storeItemState !== "closed" : data.revealed || localRevealed;
  const hasSpritesheet = Boolean(data.coverSpriteSheetSrc && spriteSheetConfig);
  // For spritesheet items: show value only after animation completes (localRevealed). Otherwise store-driven reveal would show value immediately.
  const showValue = revealed && (!hasSpritesheet || localRevealed);

  const isLuckyNumber = data.id.startsWith("ln-");
  const isYourNumber = data.id.startsWith("yn-");

  const dollarValue = `$${Math.round(((data.valueCents ?? 0) as number) / 100).toFixed(0)}`;

  function renderRevealedValue() {
    if (isYourNumber) {
      return (
        <span className="flex flex-col items-center leading-none gap-1">
          <span className="font-semibold text-xs text-text-primary">{data.value}</span>
          {glyphSheet ? (
            <GlyphValueDisplay
              value={dollarValue}
              glyphSheetSrc={glyphSheet.url}
              cols={glyphSheet.cols}
              rows={glyphSheet.rows}
              cellInset={glyphSheet.cellInset}
              className="text-[12px]"
            />
          ) : (
            <span className="text-[10px] font-semibold text-text-primary">{dollarValue}</span>
          )}
        </span>
      );
    }

    // Lucky numbers: reveal should show only the number.
    if (isLuckyNumber) {
      return (
        <span className="font-semibold text-text-primary">
          {glyphSheet ? (
            <GlyphValueDisplay
              value={data.value}
              glyphSheetSrc={glyphSheet.url}
              cols={glyphSheet.cols}
              rows={glyphSheet.rows}
              cellInset={glyphSheet.cellInset}
              className="text-[12px]"
            />
          ) : (
            <span className="text-[10px] font-semibold text-text-primary">{data.value}</span>
          )}
        </span>
      );
    }

    // Default: optionally render themed glyph value (prize-grid etc).
    if (glyphSheet) {
      return (
        <GlyphValueDisplay
          value={data.value}
          glyphSheetSrc={glyphSheet.url}
          cols={glyphSheet.cols}
          rows={glyphSheet.rows}
          cellInset={glyphSheet.cellInset}
        />
      );
    }

    return <>{data.value}</>;
  }

  // When store sets this item to open/win (e.g. revealAllInSequence), start the spritesheet animation
  useEffect(() => {
    if (
      isOnScratchCard &&
      storeItemState !== "closed" &&
      data.coverSpriteSheetSrc &&
      spriteSheetConfig &&
      !localRevealed
    ) {
      setIsPlayingRevealAnimation(true);
    }
  }, [isOnScratchCard, storeItemState, data.coverSpriteSheetSrc, spriteSheetConfig, localRevealed]);

  function handleRevealComplete() {
    if (isOnScratchCard) {
      const isWin = isYourNumber && (data.valueCents ?? 0) > 0;
      setItemState(data.id, isWin ? "win" : "open");
    }
    setLocalRevealed(true);
    setIsPlayingRevealAnimation(false);
    onReveal?.(data.id);
  }

  function handleClick() {
    if (revealed) return;
    if (data.coverSpriteSheetSrc && spriteSheetConfig) {
      if (isPlayingRevealAnimation) return;
      playRevealSound();
      setIsPlayingRevealAnimation(true);
    } else {
      playRevealSound();
      if (isOnScratchCard) setItemState(data.id, "open");
      if (onReveal) onReveal(data.id);
      else setLocalRevealed(true);
    }
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "rounded-lg flex items-center justify-center font-semibold text-text-primary overflow-hidden shrink-0",
        sizeClasses[size],
      )}
    >
      {hasSpritesheet && data.coverSpriteSheetSrc && spriteSheetConfig ? (
        <div className="relative w-full h-full">
          {/* Keep value in a stable, centered layer to avoid any layout shift at reveal-complete. */}
          <span className="absolute inset-0 flex items-center justify-center font-semibold text-text-primary">
            {renderRevealedValue()}
          </span>

          <AnimatePresence>
            {!localRevealed && (
              <motion.div
                key="cover"
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
              >
                <SpriteSheetRenderer
                  src={data.coverSpriteSheetSrc}
                  cols={spriteSheetConfig.cols}
                  rows={spriteSheetConfig.rows}
                  className="max-w-full max-h-full"
                  play={isPlayingRevealAnimation}
                  onComplete={handleRevealComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : showValue ? (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="font-semibold text-text-primary"
        >
          {renderRevealedValue()}
        </motion.span>
      ) : data.coverUrl ? (
        <img src={data.coverUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-gold-dim">?</span>
      )}
    </motion.button>
  );
}
