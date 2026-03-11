import type { CardData } from "@repo/shared";
import { cn } from "../../lib/utils";
import { ScratchCardBackground } from "./scratch-card-background";
import { Variant1, Variant2, Variant3 } from "./variants";

const DEFAULT_BACKGROUND_VIDEO = "/assets/videos/video-background.mp4";

export interface ScratchCardProps {
  cardData: CardData;
  /** Optional class name for the root element */
  className?: string;
}

export function ScratchCard({ cardData, className = "" }: ScratchCardProps) {
  const { variant } = cardData;

  if (!variant) {
    return null;
  }

  const videoUrl = cardData.backgroundVideoUrl ?? DEFAULT_BACKGROUND_VIDEO;

  return (
    <div
      className={cn(
        "relative flex flex-col h-full rounded-2xl border border-gold/30 bg-surface-raised overflow-hidden glow-gold-strong md:rounded-2xl",
        className,
      )}
    >
      <ScratchCardBackground videoUrl={videoUrl} />

      <div className="relative z-20 flex flex-col flex-1 min-h-0">
        {variant.id === "variant-1" && <Variant1 cardData={cardData} />}
        {variant.id === "variant-2" && <Variant2 cardData={cardData} />}
        {variant.id === "variant-3" && <Variant3 cardData={cardData} />}
      </div>
    </div>
  );
}
