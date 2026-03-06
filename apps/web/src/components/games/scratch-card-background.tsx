import { cn } from "../../lib/utils";

/**
 * Scratch card background — sits underneath all other card layers.
 * Supports either a video or a static image.
 */

export interface ScratchCardBackgroundProps {
  /** Image URL when using static background */
  imageUrl?: string;
  /** Video URL when using video background */
  videoUrl?: string;
  /** Alt text for image (accessibility) */
  alt?: string;
  /** Optional class name for the wrapper */
  className?: string;
}

export function ScratchCardBackground({
  imageUrl,
  videoUrl,
  alt = "",
  className = "",
}: ScratchCardBackgroundProps) {
  return (
    <div
      className={cn("absolute inset-0 z-0 overflow-hidden rounded-2xl", className)}
      aria-hidden
    >
      {videoUrl ? (
        <video
          src={videoUrl}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        /* Placeholder when no media provided */
        <div className="absolute inset-0 bg-surface-raised" />
      )}
    </div>
  );
}
