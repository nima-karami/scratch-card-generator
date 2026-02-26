import { create } from "zustand";
import type { CardData } from "@repo/shared";
import type { SSEEvent } from "../lib/api";

export type View = "landing" | "generating" | "result";

export interface GenerationProgress {
  stage: string;
  title?: string;
  tagline?: string;
  images: { id: string; url: string }[];
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
  setError: (msg: string | null) => void;
  reset: () => void;
}

const defaultProgress: GenerationProgress = {
  stage: "Starting...",
  images: [],
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
        case "text-ready":
          return {
            progress: {
              ...state.progress,
              stage: "Writing copy...",
              title: e.title,
              tagline: e.tagline,
            },
          };
        case "image-progress":
          return {
            progress: {
              ...state.progress,
              stage: e.message ?? `Image ${e.index + 1} of ${e.total}...`,
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

  setError: (msg) => set({ error: msg, view: "landing" }),

  reset: () =>
    set({
      view: "landing",
      jobId: null,
      progress: defaultProgress,
      cardData: null,
      error: null,
    }),
}));
