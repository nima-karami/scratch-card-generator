import { useRef } from "react";
import { motion } from "motion/react";
import { useGameStore } from "../stores/game-store";

export function CardResult() {
  const { cardData, reset } = useGameStore();
  const cardRef = useRef<HTMLDivElement>(null);

  if (!cardData) return null;

  function handleDownload() {
    if (!cardRef.current || !cardData) return;
    const el = cardRef.current;
    el.requestFullscreen?.().catch(() => {});
    if (navigator.clipboard) {
      const text = `${cardData.title} \u2013 ${cardData.tagline}`;
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      {/* Background glow */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gold/[0.07] blur-[140px]" />

      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Card */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl border border-gold/30 bg-surface-raised overflow-hidden glow-gold-strong"
        >
          {/* Shimmer overlay */}
          <div className="shimmer pointer-events-none absolute inset-0 z-10 rounded-2xl" />

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-gold/40 rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-gold/40 rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-gold/40 rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-gold/40 rounded-br-2xl" />

          <div className="relative z-20 p-7">
            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[10px] uppercase tracking-[0.3em] text-gold-dim font-medium mb-4"
            >
              Instant Win
            </motion.p>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="font-display text-3xl font-extrabold text-gold-light leading-tight"
            >
              {cardData.title}
            </motion.h2>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="text-text-secondary text-sm mt-2 leading-relaxed"
            >
              {cardData.tagline}
            </motion.p>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.65, duration: 0.6, ease: "easeInOut" }}
              className="h-px w-full bg-gradient-to-r from-transparent via-gold/30 to-transparent my-5 origin-left"
            />

            {/* Images */}
            <div className="flex flex-wrap gap-3">
              {cardData.images.map((img, i) => (
                <motion.img
                  key={img.id}
                  src={img.url}
                  alt={img.alt ?? ""}
                  initial={{ opacity: 0, scale: 0.6, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    delay: 0.7 + i * 0.15,
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="w-22 h-22 rounded-xl border border-gold/20 object-cover"
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="flex flex-col gap-3"
        >
          <motion.button
            type="button"
            onClick={handleDownload}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-xl border border-gold/30 bg-surface-raised py-3.5 text-sm font-semibold text-gold transition-colors duration-200 hover:bg-surface-bright"
          >
            Share / Screenshot
          </motion.button>
          <motion.button
            type="button"
            onClick={reset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-xl border border-surface-bright py-3.5 text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-text-primary hover:border-surface-bright"
          >
            Generate another
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
