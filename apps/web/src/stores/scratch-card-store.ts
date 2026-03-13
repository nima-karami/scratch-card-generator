import { create } from "zustand";

export type ScratchItemState = "closed" | "open" | "win";

interface ScratchCardState {
  itemStates: Record<string, ScratchItemState>;
  registeredIds: Set<string> | null;
  /** When true, the win overlay is hidden (user clicked Done). Reset when card changes or when triggerWinAnimation is called so overlay can show again. */
  winDismissed: boolean;
  setWinDismissed: (value: boolean) => void;
  registerItemIds: (ids: string[]) => void;
  setItemState: (id: string, state: "open" | "win") => void;
  getItemState: (id: string) => ScratchItemState;
  /** Sets every registered item to 'open' so the win animation shows. Useful for dev/testing. */
  revealAll: () => void;
  /** Reveals each registered item one by one with a delay between them. Default 100ms. */
  revealAllInSequence: (intervalMs?: number) => void;
  reset: () => void;
}

/** Selector: true when every registered item has state !== 'closed'. Use with useScratchCardStore(allRevealedSelector). */
export const allRevealedSelector = (s: ScratchCardState): boolean => {
  const { registeredIds, itemStates } = s;
  if (!registeredIds || registeredIds.size === 0) return false;
  return [...registeredIds].every((id) => itemStates[id] !== "closed");
};

const initialState = {
  itemStates: {} as Record<string, ScratchItemState>,
  registeredIds: null as Set<string> | null,
  winDismissed: false,
};

export const useScratchCardStore = create<ScratchCardState>((set, get) => ({
  ...initialState,

  setWinDismissed: (value) => set({ winDismissed: value }),

  registerItemIds: (ids) =>
    set({
      registeredIds: ids.length > 0 ? new Set(ids) : null,
      winDismissed: false,
      itemStates: ids.reduce(
        (acc, id) => {
          acc[id] = "closed";
          return acc;
        },
        {} as Record<string, ScratchItemState>,
      ),
    }),

  setItemState: (id, state) =>
    set((s) => ({
      itemStates: { ...s.itemStates, [id]: state },
    })),

  getItemState: (id) => get().itemStates[id] ?? "closed",

  revealAll: () => {
    const { registeredIds } = get();
    if (!registeredIds || registeredIds.size === 0) return;
    set((s) => {
      const next = { ...s.itemStates };
      for (const id of registeredIds) next[id] = "open";
      return { itemStates: next };
    });
  },

  revealAllInSequence: (intervalMs = 100) => {
    const { registeredIds, setItemState } = get();
    if (!registeredIds || registeredIds.size === 0) return;
    const ids = [...registeredIds];
    ids.forEach((id, index) => {
      setTimeout(() => {
        setItemState(id, "open");
      }, index * intervalMs);
    });
  },

  reset: () => set(initialState),
}));
