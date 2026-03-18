import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import "./index.css";
import { useGameStore } from "./stores/game-store";
import { useScratchCardStore } from "./stores/scratch-card-store";
import { getMockAudioAssetUrls, getMockCard, MOCK_KEYS } from "./mocks/card-data";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.DEV) {
  window.loadMockCard = (key?: string) => {
    if (key === undefined) {
      console.log("Available mock keys:", MOCK_KEYS.join(", "));
      return;
    }
    const mock = getMockCard(key);
    if (!mock) {
      console.warn(`Unknown key "${key}". Use loadMockCard() to see keys.`);
      return;
    }
    const audioAssetUrls = getMockAudioAssetUrls(key);
    if (audioAssetUrls) {
      useGameStore.getState().setMockAssetUrls(audioAssetUrls);
    }
    useGameStore.getState().setCard(mock);
  };

  window.triggerWinAnimation = () => {
    const { registeredIds, revealAll, setWinDismissed } = useScratchCardStore.getState();
    if (!registeredIds || registeredIds.size === 0) {
      console.warn(
        "No scratch card loaded. Load a card with a variant first (e.g. loadMockCard('chocolate-chip-cookie')).",
      );
      return;
    }
    setWinDismissed(false);
    revealAll();
    console.log("Win animation triggered.");
  };

  window.revealAllInSequence = (intervalMs = 100) => {
    const { registeredIds, revealAllInSequence } = useScratchCardStore.getState();
    if (!registeredIds || registeredIds.size === 0) {
      console.warn(
        "No scratch card loaded. Load a card with a variant first (e.g. loadMockCard('chocolate-chip-cookie')).",
      );
      return;
    }
    revealAllInSequence(intervalMs);
    console.log(`Revealing ${registeredIds.size} items in sequence (${intervalMs}ms between each).`);
  };
}
