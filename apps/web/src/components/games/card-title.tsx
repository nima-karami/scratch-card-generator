import { cn } from "../../lib/utils";

/**
 * Card title — displays the card title dynamically.
 * Can render as text, image, or via a sprite sheet (use SpriteSheetRenderer for animation).
 */

export interface CardTitleProps {
  /** Title text (used when no image/sprite is provided) */
  title: string;
  /** Optional image URL to use instead of text */
  imageUrl?: string;
  /** Alt text for image */
  alt?: string;
  /** Optional foreground color for text-mode rendering */
  foregroundColor?: string;
  /** Optional class name */
  className?: string;
}

export function CardTitle({
  title,
  imageUrl,
  alt,
  foregroundColor,
  className = "",
}: CardTitleProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt ?? title}
        className={cn("w-full h-full object-contain", className)}
        data-card-title
      />
    );
  }

  return (
    <h2
      className={cn(
        "font-display text-3xl font-extrabold text-gold-light leading-tight",
        className,
      )}
      style={foregroundColor ? { color: foregroundColor } : undefined}
      data-card-title
    >
      {title}
    </h2>
  );
}
