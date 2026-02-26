import { AnimatePresence, motion } from "motion/react";
import { Landing } from "./components/landing";
import { GenerationView } from "./components/generation-view";
import { CardResult } from "./components/card-result";
import { useGameStore } from "./stores/game-store";

function App() {
  const view = useGameStore((s) => s.view);

  return (
    <>
      <div className="grain" />
      <AnimatePresence mode="wait">
        {view === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <GenerationView />
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
        {view === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Landing />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
