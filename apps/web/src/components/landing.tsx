import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useGameStore } from "../stores/game-store";
import { submitPrompt } from "../lib/api";
import { MAX_PROMPT_LENGTH } from "@repo/shared";
import ModernPulseShader from "./ui/metaballs";

const STAGE_DELAY = 0.12;

/** Brand colors (RGB 0–1): bg #050D26; gradient left #0186fd, right #00f3ff */
const LANDING_SHADER_BG: [number, number, number] = [0.02, 0.05, 0.15];
const LANDING_SHADER_FG_LEFT: [number, number, number] = [0.004, 0.525, 0.992];
const LANDING_SHADER_FG_RIGHT: [number, number, number] = [0, 0.953, 1.0];
const LANDING_SHADER_GLOW_LEFT: [number, number, number] = [0.004, 0.525, 0.992];
const LANDING_SHADER_GLOW_RIGHT: [number, number, number] = [0, 0.953, 1.0];

export function Landing() {
  const navigate = useNavigate();
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
      navigate(`/card/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
      {/* Full-viewport metaballs shader background */}
      <div className="absolute inset-0 z-0">
        <ModernPulseShader
          gridSize={8}
          speed={1}
          bgColor={LANDING_SHADER_BG}
          fgColorLeft={LANDING_SHADER_FG_LEFT}
          fgColorRight={LANDING_SHADER_FG_RIGHT}
          glowColorLeft={LANDING_SHADER_GLOW_LEFT}
          glowColorRight={LANDING_SHADER_GLOW_RIGHT}
          grainIntensity={0.03}
          className="absolute inset-0 w-full h-full"
          ariaLabel="Animated background"
        />
      </div>
      {/* Radial glow behind the form */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] z-[1]" />

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGE_DELAY * 0, duration: 0.5 }}
          className="text-center text-xs font-medium uppercase tracking-[0.25em] text-landing-muted mb-4"
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
          <span className="text-landing-title">Scratch Card</span>
          <br />
          <span className="text-landing-accent">Generator</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGE_DELAY * 2, duration: 0.5 }}
          className="text-center text-landing-subtitle text-sm mt-3 mb-10 max-w-md mx-auto leading-relaxed"
        >
          Enter a theme and watch AI craft your one-of-a-kind instant&#8209;win card.
        </motion.p>

        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGE_DELAY * 5, duration: 0.55, ease: "easeOut" }}
          className="space-y-4 w-full"
        >
          <div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. retro space arcade, summer beach party, cozy coffee shop"
              maxLength={MAX_PROMPT_LENGTH + 1}
              disabled={submitting}
              rows={4}
              className="w-full rounded-xl border border-surface-bright bg-surface px-4 py-3.5 text-sm text-landing-input placeholder:text-landing-input-muted outline-none transition-all duration-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 disabled:opacity-70 resize-y min-h-24"
            />
            <p className="mt-1.5 text-right text-xs tabular-nums text-landing-muted">
              {input.length}/{MAX_PROMPT_LENGTH}
            </p>
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
            whileHover={{ scale: submitting || !input.trim() ? 1 : 1.02 }}
            whileTap={{ scale: submitting || !input.trim() ? 1 : 0.97 }}
            className="w-full rounded-xl py-3.5 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed enabled:bg-primary enabled:text-void enabled:hover:bg-primary-light disabled:bg-surface-bright disabled:text-landing-muted"
          >
            {submitting ? "Creating\u2026" : "Generate my card"}
          </motion.button>
        </motion.form>

        {/* Decorative bottom line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: STAGE_DELAY * 6, duration: 0.8, ease: "easeInOut" }}
          className="mx-auto mt-10 h-px w-24 origin-center bg-gradient-to-r from-transparent via-primary-light/50 to-transparent"
        />
      </div>
    </div>
  );
}
