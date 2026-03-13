/// <reference types="vite/client" />

declare global {
  interface Window {
    /** Dev only: load a mock card by key and jump to result view. Call with no args to log keys. */
    loadMockCard?: (key?: string) => void;
    /** Dev only: reveal all scratch items so the win animation shows. Requires a scratch card to be loaded first (e.g. loadMockCard('key')). */
    triggerWinAnimation?: () => void;
    /** Dev only: reveal all scratch items one by one (e.g. every 100ms). Optional interval in ms. Requires a scratch card to be loaded first. */
    revealAllInSequence?: (intervalMs?: number) => void;
  }
}

export {};
