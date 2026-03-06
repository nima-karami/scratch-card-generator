/// <reference types="vite/client" />

declare global {
  interface Window {
    /** Dev only: load a mock card by key and jump to result view. Call with no args to log keys. */
    loadMockCard?: (key?: string) => void;
  }
}

export {};
