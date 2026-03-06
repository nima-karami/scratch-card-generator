import type { CardData } from "@repo/shared";
import { cn } from "../../lib/utils";
import { ScratchCardBackground } from "./scratch-card-background";
import { Variant1, Variant2, Variant3 } from "./variants";

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

  return (
    <div
      className={cn(
        "relative flex flex-col h-full rounded-2xl border border-gold/30 bg-surface-raised overflow-hidden glow-gold-strong md:rounded-2xl",
        className,
      )}
    >
      <ScratchCardBackground />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-gold/40 rounded-tl-2xl z-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-gold/40 rounded-tr-2xl z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-gold/40 rounded-bl-2xl z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-gold/40 rounded-br-2xl z-10 pointer-events-none" />

      <div className="relative z-20 flex flex-col flex-1 min-h-0">
        {variant.id === "variant-1" && <Variant1 cardData={cardData} />}
        {variant.id === "variant-2" && <Variant2 cardData={cardData} />}
        {variant.id === "variant-3" && <Variant3 cardData={cardData} />}
      </div>
    </div>
  );
}
