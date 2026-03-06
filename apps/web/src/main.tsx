import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import "./index.css";
import { useGameStore } from "./stores/game-store";
import { getMockCard, MOCK_KEYS } from "./mocks/card-data";

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
    useGameStore.getState().setCard(mock);
  };
}
