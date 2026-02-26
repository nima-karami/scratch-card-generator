import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGameStore } from "../stores/game-store";
import { getCard, subscribeToStatus } from "../lib/api";

const STAGE_LABELS: Record<string, string> = {
  "Starting...": "Warming up the press\u2026",
  "Writing copy...": "Crafting your headline\u2026",
  "Generating images...": "Painting your icons\u2026",
  "Adding images...": "Placing artwork\u2026",
  "Composing your card...": "Assembling the card\u2026",
  "Done!": "Ready!",
};

function friendlyStage(raw: string): string {
  return STAGE_LABELS[raw] ?? raw;
}

export function GenerationView() {
  const { jobId, progress, applySSEEvent, setCard, setError } = useGameStore();
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!jobId) return;
    unsubRef.current = subscribeToStatus(
      jobId,
      (e) => {
        applySSEEvent(e);
        if (e.type === "complete") {
          getCard(jobId)
            .then(setCard)
            .catch((err) => setError(err.message));
        }
      },
      (err) => setError(err.message),
    );
    return () => {
      unsubRef.current?.();
    };
  }, [jobId, applySSEEvent, setCard, setError]);

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      {/* Background glow */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold/[0.05] blur-[100px]" />

      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Card preview shell */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="rounded-2xl border border-surface-bright bg-surface-raised p-6 min-h-[240px] flex flex-col justify-between glow-gold"
        >
          {/* Text slots */}
          <div>
            <AnimatePresence>
              {progress.title && (
                <motion.h2
                  key="title"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="font-display text-2xl font-bold text-gold-light"
                >
                  {progress.title}
                </motion.h2>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {progress.tagline && (
                <motion.p
                  key="tagline"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                  className="text-text-secondary text-sm mt-1.5"
                >
                  {progress.tagline}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Image slots */}
          <div className="flex flex-wrap gap-3 mt-6">
            <AnimatePresence>
              {progress.images.map((img, i) => (
                <motion.img
                  key={img.id}
                  src={img.url}
                  alt=""
                  initial={{ opacity: 0, scale: 0.7, rotate: -4 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: i * 0.12,
                    ease: "easeOut",
                  }}
                  className="w-18 h-18 rounded-lg border border-gold/20 object-cover"
                />
              ))}
            </AnimatePresence>

            {/* Placeholder skeleton slots */}
            {progress.images.length < 2 &&
              Array.from({ length: 2 - progress.images.length }).map((_, i) => (
                <div
                  key={`skel-${i}`}
                  className="w-18 h-18 rounded-lg border border-surface-bright bg-surface shimmer"
                />
              ))}
          </div>
        </motion.div>

        {/* Stage indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-center justify-center gap-3"
        >
          {/* Pulsing dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
          </span>
          <p className="text-xs font-medium text-text-secondary tracking-wide">
            {friendlyStage(progress.stage)}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
