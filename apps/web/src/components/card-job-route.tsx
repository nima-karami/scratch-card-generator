import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useGameStore } from "../stores/game-store";
import { getCard } from "../lib/api";
import { isJobIdParam } from "../lib/job-id";
import { GenerationView } from "./generation-view";
import { CardResult } from "./card-result";
import { setLandingErrorMessage } from "./landing-route";

export function CardJobRoute() {
  const { jobId: rawJobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [hydrated, setHydrated] = useState(false);
  const view = useGameStore((s) => s.view);

  const onFatalError = (message: string) => {
    const text =
      message === "SSE connection error"
        ? "This job could not be found or may have expired. Start a new card from the home page."
        : message;
    setLandingErrorMessage(text);
    navigate("/");
  };

  useEffect(() => {
    if (!isJobIdParam(rawJobId)) {
      return;
    }
    const jobId = rawJobId;
    const store = useGameStore.getState();
    if (store.jobId === jobId && store.view === "generating") {
      setHydrated(true);
      return;
    }

    let cancelled = false;
    setHydrated(false);

    (async () => {
      try {
        const card = await getCard(jobId);
        if (cancelled) return;
        useGameStore.getState().openCompletedJob(jobId, card);
      } catch {
        if (cancelled) return;
        useGameStore.getState().setGenerating(jobId);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawJobId]);

  if (!isJobIdParam(rawJobId)) {
    return <Navigate to="/" replace />;
  }

  if (!hydrated) {
    return (
      <div className="relative min-h-dvh flex flex-col items-center justify-center px-6">
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold/5 blur-[100px]" />
        <p className="relative z-10 text-sm font-medium text-text-secondary tracking-wide">
          Loading card…
        </p>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {view === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <GenerationView onFatalError={onFatalError} />
          </motion.div>
        )}
        {view === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <CardResult />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
