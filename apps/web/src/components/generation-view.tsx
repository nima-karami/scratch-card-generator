import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGameStore } from "../stores/game-store";
import { getCard, subscribeToStatus, resolveAssetUrl } from "../lib/api";
import { ScratchCardBackground, ScratchCardHeader } from "./games";

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
  const logEndRef = useRef<HTMLDivElement | null>(null);

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

  // Auto-scroll live log as new SSE messages arrive.
  useEffect(() => {
    logEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [progress.log.length]);

  const backgroundVideoUrl = progress.assetUrls.backgroundVideo
    ? resolveAssetUrl(progress.assetUrls.backgroundVideo)
    : undefined;
  const backgroundImageUrl = progress.assetUrls.backgroundImage
    ? resolveAssetUrl(progress.assetUrls.backgroundImage)
    : undefined;
  const titleImageUrl = progress.assetUrls.titleImage
    ? resolveAssetUrl(progress.assetUrls.titleImage)
    : undefined;
  const hasBackground = Boolean(backgroundVideoUrl || backgroundImageUrl);

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      {/* Background glow */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold/5 blur-[100px]" />

      <div className="relative z-10 w-full max-w-sm space-y-8">
        {/* Card shell — same layout as result card: background + header + games area */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-2xl border border-surface-bright bg-surface-raised min-h-[360px] overflow-hidden glow-gold flex flex-col"
        >
          {/* Background layer: streamed asset or placeholder with shimmer */}
          <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden">
            {hasBackground ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key="bg-asset"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0"
                >
                  <ScratchCardBackground
                    videoUrl={backgroundVideoUrl}
                    imageUrl={backgroundImageUrl}
                    className="rounded-2xl"
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              <div
                className="absolute inset-0 rounded-2xl bg-surface-raised shimmer"
                aria-hidden
              />
            )}
          </div>

          {/* Content layer */}
          <div className="relative z-20 flex flex-col flex-1 min-h-0 p-6">
            {/* Header: title, title image (or placeholder) */}
            <div className="flex flex-col items-center text-center">
              <AnimatePresence mode="wait">
                {progress.title != null && (
                  <motion.div
                    key={titleImageUrl ?? "title-text"}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                  >
                    <ScratchCardHeader
                      title={progress.title || "..."}
                      titleImageUrl={titleImageUrl}
                      className="pt-2"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {progress.title == null && (
                <div className="h-12 w-3/4 rounded-lg bg-surface border border-surface-bright shimmer mt-4 mx-auto" />
              )}
            </div>

            {/* Games area placeholder — no variant until compose completes */}
            <div className="flex-1 flex items-center justify-center min-h-[140px] mt-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="w-full rounded-xl border border-surface-bright bg-surface/80 backdrop-blur-sm shimmer py-8 px-6 flex items-center justify-center"
              >
                <p className="text-sm font-medium text-text-secondary tracking-wide">
                  {friendlyStage(progress.stage)}
                </p>
              </motion.div>
            </div>

            {/* Live progress log */}
            <div className="mt-4 w-full rounded-lg border border-surface-bright/60 bg-surface/60 backdrop-blur-sm px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-text-secondary font-semibold">
                  Live log
                </p>
                <p className="text-[11px] text-text-secondary/90">
                  {progress.log.length > 0 ? `${progress.log.length} updates` : "Waiting..."}
                </p>
              </div>
              <div className="max-h-28 overflow-y-auto pr-1">
                {progress.log.length === 0 ? (
                  <p className="text-xs text-text-secondary/90 leading-relaxed">
                    Messages will appear here as the backend generates your theme.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {progress.log.map((entry) => (
                      <p
                        key={`${entry.at}-${entry.text}`}
                        className="text-[12px] text-text-secondary/95 leading-relaxed wrap-break-word"
                      >
                        {entry.text}
                      </p>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
