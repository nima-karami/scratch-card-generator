import { useState } from "react";
import { motion } from "motion/react";
import { useGameStore } from "../stores/game-store";
import { submitPrompt } from "../lib/api";
import { MAX_PROMPT_LENGTH } from "@repo/shared";

const STAGE_DELAY = 0.12;

export function Landing() {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { setPrompt, setGenerating, setError, error } = useGameStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || submitting) return;
    if (trimmed.length > MAX_PROMPT_LENGTH) {
      setError(`Prompt must be at most ${MAX_PROMPT_LENGTH} characters`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { jobId } = await submitPrompt(trimmed);
      setPrompt(trimmed);
      setGenerating(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      {/* Radial glow behind the form */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/[0.06] blur-[120px]" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGE_DELAY * 0, duration: 0.5 }}
          className="text-center text-xs font-medium uppercase tracking-[0.25em] text-gold-dim mb-4"
        >
          The AI Playground
        </motion.p>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGE_DELAY * 1, duration: 0.6, ease: "easeOut" }}
          className="font-display text-4xl sm:text-5xl font-extrabold text-center leading-tight tracking-tight"
        >
          <span className="text-text-primary">Scratch Card</span>
          <br />
          <span className="text-gold">Generator</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGE_DELAY * 3, duration: 0.5 }}
          className="text-center text-text-secondary text-sm mt-3 mb-10 max-w-xs mx-auto leading-relaxed"
        >
          Enter a theme and watch AI craft your one-of-a-kind instant&#8209;win card.
        </motion.p>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGE_DELAY * 5, duration: 0.55, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="retro space arcade"
              maxLength={MAX_PROMPT_LENGTH + 1}
              disabled={submitting}
              className="w-full rounded-xl border border-surface-bright bg-surface px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-200 focus:border-gold/50 focus:ring-1 focus:ring-gold/30 disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums text-text-muted">
              {input.length}/{MAX_PROMPT_LENGTH}
            </span>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-danger pl-1"
              role="alert"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={submitting || !input.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-xl bg-gold py-3.5 text-sm font-semibold text-void transition-colors duration-200 hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating\u2026" : "Generate my card"}
          </motion.button>
        </motion.form>

        {/* Decorative bottom line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: STAGE_DELAY * 7, duration: 0.8, ease: "easeInOut" }}
          className="mx-auto mt-10 h-px w-24 origin-center bg-gradient-to-r from-transparent via-gold/40 to-transparent"
        />
      </div>
    </div>
  );
}
