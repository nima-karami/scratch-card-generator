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
      switch (e.type) {
        case "designing":
          return {
            progress: {
              ...state.progress,
              stage: e.message ?? "Designing your theme...",
            },
          };
        case "text-ready":
          return {
            progress: {
              ...state.progress,
              stage: "Writing copy...",
              title: e.title,
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
            },
          };
        case "image-ready":
          return {
            progress: {
              ...state.progress,
              stage: "Adding images...",
              images: [...state.progress.images, { id: e.id, url: e.url }],
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
            },
          };
        case "composing":
          return {
            progress: {
              ...state.progress,
              stage: e.message ?? "Composing your card...",
            },
          };
        case "complete":
          return { progress: { ...state.progress, stage: "Done!" } };
        case "error":
          return { error: e.message, view: "landing" as View };
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
