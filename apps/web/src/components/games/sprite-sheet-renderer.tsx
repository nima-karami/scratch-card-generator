import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { animate, useMotionValue, useTransform, motion } from "motion/react";

export interface SpriteSheetRendererProps {
  /** URL of the sprite sheet image */
  src: string;
  /** Number of columns in the grid */
  cols: number;
  /** Number of rows in the grid */
  rows: number;
  /** "once" = play through once and stop; "loop" = repeat indefinitely */
  mode?: "once" | "loop";
  /** Duration in ms for one full cycle (all frames). Ignored if fps is set. */
  durationMs?: number;
  /** Frames per second. Takes precedence over durationMs if set. */
  fps?: number;
  /** Optional class name for the wrapper */
  className?: string;
  /** Callback when a "once" animation finishes */
  onComplete?: () => void;
  /** When false, show frame 0 and do not animate. When true, play once. When undefined, use mode (default: auto-play). */
  play?: boolean;
}

export function SpriteSheetRenderer({
  src,
  cols,
  rows,
  mode = "loop",
  play,
  durationMs,
  fps,
  className = "",
  onComplete,
}: SpriteSheetRendererProps) {
  const [frameAspectRatio, setFrameAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const fw = img.naturalWidth / cols;
      const fh = img.naturalHeight / rows;
      setFrameAspectRatio(fw / fh);
    };
    img.src = src;
  }, [src, cols, rows]);

  const totalFrames = cols * rows;
  const frameDurationMs = fps != null ? 1000 / fps : (durationMs ?? 1000) / totalFrames;
  const durationSec = (totalFrames * frameDurationMs) / 1000;

  const frame = useMotionValue(0);

  const backgroundPosition = useTransform(frame, (v) => {
    const index = Math.min(Math.floor(v), totalFrames - 1);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const xPct = cols === 1 ? 0 : (col / (cols - 1)) * 100;
    const yPct = rows === 1 ? 0 : (row / (rows - 1)) * 100;
    return `${xPct}% ${yPct}%`;
  });

  useEffect(() => {
    if (frameAspectRatio === null) return;
    if (play === false) return;
    const effectiveMode = play === true ? "once" : mode;
    const controls = animate(frame, totalFrames, {
      duration: durationSec,
      repeat: effectiveMode === "loop" ? Infinity : 0,
      onComplete: effectiveMode === "once" ? onComplete : undefined,
    });
    return () => controls.stop();
  }, [frame, totalFrames, durationSec, mode, play, onComplete, frameAspectRatio]);

  if (frameAspectRatio === null) {
    return (
      <div
        className={cn("overflow-hidden bg-surface-bright animate-pulse", className)}
        style={{ aspectRatio: `${cols} / ${rows}` }}
        data-sprite-sheet
      />
    );
  }

  return (
    <div
      className={cn("overflow-hidden", className)}
      style={{ width: "100%", aspectRatio: frameAspectRatio }}
      data-sprite-sheet
    >
      <motion.div
        className="h-full w-full bg-no-repeat"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: `${cols * 100}% ${rows * 100}%`,
          backgroundPosition,
        }}
      />
    </div>
  );
}
