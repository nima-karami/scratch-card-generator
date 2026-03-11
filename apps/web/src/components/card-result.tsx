import { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useGameStore } from "../stores/game-store";
import { useSoundStore } from "../stores/sound-store";
import { ScratchCard } from "./games";

export function CardResult() {
  const { cardData, reset } = useGameStore();
  const { muted, toggleMuted, startBGM, stopBGM } = useSoundStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (muted) return;
    startBGM();
    return () => {
      stopBGM();
    };
  }, [muted, startBGM, stopBGM]);

  if (!cardData) return null;

  function handleShare() {
    if (!cardRef.current || !cardData) return;
    const el = cardRef.current;
    el.requestFullscreen?.().catch(() => {});
    if (navigator.clipboard) {
      const text = `${cardData.title} \u2013 ${cardData.tagline}`;
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setMenuOpen(false);
  }

  function handleGenerateAnother() {
    reset();
    setMenuOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <div className="fixed inset-0 flex min-h-dvh flex-col">
      {/* Background glow - hidden on mobile when card is full-screen */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gold/[0.07] blur-[140px] md:block hidden" />

      {/* Full-screen card area on mobile, centered on desktop */}
      <div className="flex flex-1 min-h-0 items-center justify-center overflow-hidden p-0 md:p-6">
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="h-full w-full md:h-auto md:max-w-sm md:w-full"
        >
          {cardData.variant ? (
            <ScratchCard
              cardData={cardData}
              className="h-full w-full rounded-none md:rounded-2xl md:h-auto md:w-auto"
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full w-full rounded-none border border-gold/30 bg-surface-raised overflow-hidden glow-gold-strong p-7 md:rounded-2xl md:h-auto md:w-auto"
            >
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold-dim font-medium mb-4">
                Instant Win
              </p>
              <h2 className="font-display text-3xl font-extrabold text-gold-light leading-tight">
                {cardData.title}
              </h2>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                {cardData.tagline}
              </p>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/30 to-transparent my-5" />
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
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Menu button - top right */}
      <div ref={menuRef} className="absolute right-4 top-4 z-30 md:right-6 md:top-6">
        <motion.button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-surface-raised/90 backdrop-blur-sm text-gold shadow-lg transition-colors hover:bg-surface-bright"
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="6" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="18" r="1.5" fill="currentColor" />
          </svg>
        </motion.button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute right-0 top-12 min-w-[180px] rounded-xl border border-gold/30 bg-surface-raised py-2 shadow-xl"
            >
              <button
                type="button"
                onClick={handleShare}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-gold transition-colors hover:bg-surface-bright"
              >
                Share / Screenshot
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleMuted();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-surface-bright hover:text-text-primary"
              >
                {muted ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                    Unmute sounds
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                    Mute sounds
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleGenerateAnother}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-surface-bright hover:text-text-primary"
              >
                Generate another
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
