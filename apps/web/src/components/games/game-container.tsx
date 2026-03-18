/**
 * Game container — wraps a single game slot with a specific design.
 * Use this to add frames, padding, or visual treatment around the game area.
 * Each game slot can have its own container (or none) with different designs.
 */

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import type { GameContainerSurfaceTheme } from "@repo/shared";

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
  /** Theme-controlled surface styling for wrapper (bg/border/radius). */
  surface?: GameContainerSurfaceTheme;
}

export function GameContainer({
  children,
  variant = "default",
  backgroundImageUrl,
  backgroundSize = "cover",
  backgroundPosition = "center",
  className = "",
  surface,
}: GameContainerProps) {
  if (variant === "none") {
    return <>{children}</>;
  }

  const isImageVariant = variant === "image" && backgroundImageUrl;

  const radiusClass = (() => {
    const br = surface?.borderRadius;
    if (br === "none") return "rounded-none";
    if (br === "sm") return "rounded-lg";
    if (br === "md") return "rounded-xl";
    if (br === "lg") return "rounded-2xl";
    return "rounded-xl";
  })();

  const borderWidthClass = (() => {
    const bt = surface?.borderThickness;
    if (bt === "none") return "border-0";
    if (bt === "sm") return "border-2";
    if (bt === "md") return "border-[3px]";
    if (bt === "lg") return "border-4";
    return "border";
  })();

  let style: React.CSSProperties | undefined;
  if (isImageVariant) {
    style = {
      backgroundImage: `url(${backgroundImageUrl})`,
      backgroundSize,
      backgroundPosition,
      backgroundColor: surface?.backgroundColor,
      borderColor: surface?.borderColor,
    };
  } else if (surface) {
    style = { backgroundColor: surface.backgroundColor, borderColor: surface.borderColor };
  }

  let backgroundClass = "bg-surface-bright/50";
  if (surface) backgroundClass = "bg-transparent";
  else if (isImageVariant) backgroundClass = "bg-surface-bright/30";

  const borderColorClass = surface ? undefined : "border-gold/20";

  return (
    <div
      className={cn(
        "relative z-10 p-4 border",
        radiusClass,
        borderWidthClass,
        backgroundClass,
        borderColorClass,
        className,
      )}
      style={style}
      data-game-container
    >
      {children}
    </div>
  );
}
