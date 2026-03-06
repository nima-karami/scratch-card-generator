import { useState } from "react";
import { motion } from "motion/react";
import type { GameItemData } from "@repo/shared";
import { cn } from "../../lib/utils";
import { SpriteSheetRenderer } from "./sprite-sheet-renderer";

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
}

export function GameItem({ data, size = "md", onReveal, spriteSheetConfig }: GameItemProps) {
  const [localRevealed, setLocalRevealed] = useState(false);
  const [isPlayingRevealAnimation, setIsPlayingRevealAnimation] = useState(false);
  const revealed = data.revealed || localRevealed;

  function handleRevealComplete() {
    setLocalRevealed(true);
    setIsPlayingRevealAnimation(false);
    onReveal?.(data.id);
  }

  function handleClick() {
    if (revealed) return;
    if (data.coverSpriteSheetSrc && spriteSheetConfig) {
      if (isPlayingRevealAnimation) return;
      setIsPlayingRevealAnimation(true);
    } else {
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
      className={cn("rounded-lg border border-gold/30 bg-surface-bright flex items-center justify-center font-semibold text-text-primary overflow-hidden shrink-0", sizeClasses[size])}
    >
      {data.coverSpriteSheetSrc && spriteSheetConfig ? (
        <div className="relative w-full h-full">
          <span className="absolute inset-0 flex items-center justify-center font-semibold text-text-primary">
            {data.value}
          </span>
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <SpriteSheetRenderer
              src={data.coverSpriteSheetSrc}
              cols={spriteSheetConfig.cols}
              rows={spriteSheetConfig.rows}
              className="max-w-full max-h-full"
              play={isPlayingRevealAnimation}
              onComplete={handleRevealComplete}
            />
          </div>
        </div>
      ) : revealed ? (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          {data.value}
        </motion.span>
      ) : data.coverUrl ? (
        <img
          src={data.coverUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-gold-dim">?</span>
      )}
    </motion.button>
  );
}
