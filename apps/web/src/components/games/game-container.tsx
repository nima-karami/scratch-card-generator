/**
 * Game container — wraps a single game slot with a specific design.
 * Use this to add frames, padding, or visual treatment around the game area.
 * Each game slot can have its own container (or none) with different designs.
 */

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export type GameContainerVariant = "none" | "default" | "image";

export interface GameContainerProps {
  children: ReactNode;
  /**
   * "none" — render only children (no wrapper).
   * "default" — styled box (border, padding, subtle bg).
   * "image" — same as default but with an optional background image (pattern, gradient, or solid).
   */
  variant?: GameContainerVariant;
  /**
   * URL for background image when variant="image".
   * Use generated container images (e.g. from POST /api/container-image or generate-container-image script).
   */
  backgroundImageUrl?: string;
  /** CSS background-size when using backgroundImageUrl. Default: cover */
  backgroundSize?: "cover" | "contain" | "auto" | string;
  /** CSS background-position when using backgroundImageUrl. Default: center */
  backgroundPosition?: string;
  /** Optional class name for the container (ignored when variant="none") */
  className?: string;
}

export function GameContainer({
  children,
  variant = "default",
  backgroundImageUrl,
  backgroundSize = "cover",
  backgroundPosition = "center",
  className = "",
}: GameContainerProps) {
  if (variant === "none") {
    return <>{children}</>;
  }

  const isImageVariant = variant === "image" && backgroundImageUrl;
  const style = isImageVariant
    ? {
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize,
        backgroundPosition,
      }
    : undefined;

  return (
    <div
      className={cn(
        "relative z-10 rounded-xl border border-gold/20 p-4",
        isImageVariant ? "bg-surface-bright/30" : "bg-surface-bright/50",
        className,
      )}
      style={style}
      data-game-container
    >
      {children}
    </div>
  );
}
