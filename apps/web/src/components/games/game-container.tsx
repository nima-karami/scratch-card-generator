/**
 * Game container — wraps a single game slot with a specific design.
 * Use this to add frames, padding, or visual treatment around the game area.
 * Each game slot can have its own container (or none) with different designs.
 */

import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface GameContainerProps {
  children: ReactNode;
  /**
   * When "none", renders only children (no wrapper).
   * Use for games that don't need a container or have their own.
   */
  variant?: "default" | "none";
  /** Optional class name for the container (ignored when variant="none") */
  className?: string;
}

export function GameContainer({
  children,
  variant = "default",
  className = "",
}: GameContainerProps) {
  if (variant === "none") {
    return <>{children}</>;
  }
  return (
    <div
      className={cn("relative z-10 rounded-xl border border-gold/20 bg-surface-bright/50 p-4", className)}
      data-game-container
    >
      {children}
    </div>
  );
}
