import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Landing } from "./landing";
import { useGameStore } from "../stores/game-store";

const LANDING_ERROR_KEY = "scratch-card-landing-error";

export function setLandingErrorMessage(message: string) {
  try {
    sessionStorage.setItem(LANDING_ERROR_KEY, message);
  } catch {
    /* ignore */
  }
}

export function LandingRoute() {
  useEffect(() => {
    useGameStore.getState().reset();
    let msg: string | null = null;
    try {
      msg = sessionStorage.getItem(LANDING_ERROR_KEY);
      if (msg) sessionStorage.removeItem(LANDING_ERROR_KEY);
    } catch {
      /* ignore */
    }
    if (msg) useGameStore.getState().setError(msg);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="landing"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Landing />
      </motion.div>
    </AnimatePresence>
  );
}
