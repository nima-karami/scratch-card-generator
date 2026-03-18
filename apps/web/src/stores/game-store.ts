import { create } from "zustand";
import type { CardData } from "@repo/shared";
import type { SSEEvent } from "../lib/api";
import { useScratchCardStore } from "./scratch-card-store";

export type View = "landing" | "generating" | "result";

export interface GenerationProgress {
  stage: string;
  title?: string;
  images: { id: string; url: string }[];
  /** Asset slot ids from card-structure event (e.g. titleImage, backgroundImage). */
  assetSlots: string[];
  /** Filled as asset-ready events arrive: kind -> url. */
  assetUrls: Record<string, string>;
  /** Streaming log of recent progress messages (capped to avoid unbounded growth). */
  log: { at: number; text: string }[];
}

interface GameState {
  view: View;
  prompt: string;
  jobId: string | null;
  progress: GenerationProgress;
  cardData: CardData | null;
  error: string | null;
  setPrompt: (p: string) => void;
  setGenerating: (jobId: string) => void;
  applySSEEvent: (e: SSEEvent) => void;
  setCard: (data: CardData) => void;
  setMockAssetUrls: (assetUrls: Record<string, string>) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

const defaultProgress: GenerationProgress = {
  stage: "Starting...",
  images: [],
  assetSlots: [],
  assetUrls: {},
  log: [],
};

export const useGameStore = create<GameState>((set) => ({
  view: "landing",
  prompt: "",
  jobId: null,
  progress: defaultProgress,
  cardData: null,
  error: null,

  setPrompt: (p) => set({ prompt: p, error: null }),

  setGenerating: (jobId) =>
    set({
      view: "generating",
      jobId,
      progress: defaultProgress,
      cardData: null,
      error: null,
    }),

  applySSEEvent: (e) =>
    set((state) => {
      const pushLog = (text?: string): GenerationProgress["log"] => {
        if (!text) return state.progress.log;
        const next = [...state.progress.log, { at: Date.now(), text }];
        return next.length > 50 ? next.slice(next.length - 50) : next;
      };
      switch (e.type) {
        case "designing":
          return {
            progress: {
              ...state.progress,
              stage: e.message ?? "Designing your theme...",
              log: pushLog(e.message),
            },
          };
        case "text-ready":
          return {
            progress: {
              ...state.progress,
              stage: "Writing copy...",
              title: e.title,
              log: pushLog(`Theme copy ready: ${e.title}`),
            },
          };
        case "image-progress":
        case "generating-spritesheet":
        case "generating-particles":
        case "generating-title":
        case "generating-container":
        case "generating-glyph-sheet":
        case "generating-bgm":
        case "generating-reveal-sound":
        case "generating-video-image":
        case "generating-video":
          return {
            progress: {
              ...state.progress,
              stage: e.message ?? "Generating assets...",
              log: pushLog(e.message),
            },
          };
        case "image-ready":
          return {
            progress: {
              ...state.progress,
              stage: "Adding images...",
              images: [...state.progress.images, { id: e.id, url: e.url }],
              log: pushLog(`Image ready: ${e.id}`),
            },
          };
        case "card-structure":
          return {
            progress: {
              ...state.progress,
              assetSlots: e.slots,
            },
          };
        case "asset-ready":
          return {
            progress: {
              ...state.progress,
              stage: "Adding images...",
              assetUrls: { ...state.progress.assetUrls, [e.kind]: e.url },
              log: pushLog(`Asset ready: ${e.kind}`),
            },
          };
        case "composing":
          return {
            progress: {
              ...state.progress,
              stage: e.message ?? "Composing your card...",
              log: pushLog(e.message),
            },
          };
        case "complete":
          return { progress: { ...state.progress, stage: "Done!", log: pushLog("Done!") } };
        case "error":
          return { error: e.message, view: "landing" as View, progress: { ...state.progress, log: pushLog(`Error: ${e.message}`) } };
        default:
          return state;
      }
    }),

  setCard: (data) => set({ cardData: data, view: "result", error: null }),

  setMockAssetUrls: (assetUrls) =>
    set((state) => ({
      progress: {
        ...state.progress,
        assetUrls,
      },
    })),

  setError: (msg) => set({ error: msg, view: "landing" }),

  reset: () => {
    useScratchCardStore.getState().reset();
    set({
      view: "landing",
      jobId: null,
      progress: defaultProgress,
      cardData: null,
      error: null,
    });
  },
}));
