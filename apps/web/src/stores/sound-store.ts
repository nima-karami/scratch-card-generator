import { create } from "zustand";

const BGM_VOLUME = 0.25;
const REVEAL_VOLUME = 0.75;
const BGM_SRC = "/assets/sounds/bgm-loop.mp3";
const REVEAL_SRC = "/assets/sounds/reveal-chime.mp3";

let bgmAudio: HTMLAudioElement | null = null;

function getBGM(): HTMLAudioElement {
  if (!bgmAudio) {
    bgmAudio = new Audio(BGM_SRC);
    bgmAudio.loop = true;
    bgmAudio.volume = BGM_VOLUME;
  }
  return bgmAudio;
}

function getInitialMuted(): boolean {
  try {
    const s = localStorage.getItem("scratch-card-muted");
    return s === "true";
  } catch {
    return false;
  }
}

interface SoundState {
  muted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  playRevealSound: () => void;
  startBGM: () => void;
  stopBGM: () => void;
}

export const useSoundStore = create<SoundState>((set, get) => ({
  muted: getInitialMuted(),

  setMuted: (muted) => {
    set({ muted });
    try {
      localStorage.setItem("scratch-card-muted", String(muted));
    } catch {
      // ignore
    }
    if (muted && bgmAudio) {
      bgmAudio.pause();
    }
  },

  toggleMuted: () => get().setMuted(!get().muted),

  playRevealSound: () => {
    if (get().muted) return;
    const a = new Audio(REVEAL_SRC);
    a.volume = REVEAL_VOLUME;
    a.play().catch(() => {});
  },

  startBGM: () => {
    if (get().muted) return;
    const bgm = getBGM();
    bgm.volume = BGM_VOLUME;
    bgm.play().catch(() => {});
  },

  stopBGM: () => {
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
    }
  },
}));
