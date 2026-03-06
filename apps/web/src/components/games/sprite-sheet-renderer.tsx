import { useEffect } from "react";
import { cn } from "../../lib/utils";
import { animate, useMotionValue, useTransform, motion } from "motion/react";

export interface SpriteSheetRendererProps {
  /** URL of the sprite sheet image */
  src: string;
  /** Width of a single frame in the sheet (px) */
  frameWidth: number;
  /** Height of a single frame in the sheet (px) */
  frameHeight: number;
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
}

export function SpriteSheetRenderer({
  src,
  frameWidth,
  frameHeight,
  cols,
  rows,
  mode = "loop",
  durationMs,
  fps,
  className = "",
  onComplete,
}: SpriteSheetRendererProps) {
  const totalFrames = cols * rows;
  const frameDurationMs =
    fps != null ? 1000 / fps : (durationMs ?? 1000) / totalFrames;
  const durationSec = (totalFrames * frameDurationMs) / 1000;

  const frame = useMotionValue(0);

  const backgroundPosition = useTransform(frame, (v) => {
    const index = Math.min(Math.floor(v), totalFrames - 1);
    const col = index % cols;
    const row = Math.floor(index / cols);
    return `${-col * frameWidth}px ${-row * frameHeight}px`;
  });

  useEffect(() => {
    const controls = animate(frame, totalFrames, {
      duration: durationSec,
      repeat: mode === "loop" ? Infinity : 0,
      onComplete: mode === "once" ? onComplete : undefined,
    });
    return () => controls.stop();
  }, [frame, totalFrames, durationSec, mode, onComplete]);

  return (
    <div
      className={cn("overflow-hidden", className)}
      style={{ width: frameWidth, height: frameHeight }}
      data-sprite-sheet
    >
      <motion.div
        className="h-full w-full bg-no-repeat"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: `${cols * frameWidth}px ${rows * frameHeight}px`,
          backgroundPosition,
        }}
      />
    </div>
  );
}
