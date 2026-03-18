import { create } from "zustand";

const BGM_VOLUME = 0.25;
const REVEAL_VOLUME = 0.75;
const BGM_DEFAULT_SRC = "/assets/sounds/bgm-loop.mp3";
const REVEAL_DEFAULT_SRC = "/assets/sounds/reveal-chime.mp3";

let bgmAudio: HTMLAudioElement | null = null;
let bgmSrc = BGM_DEFAULT_SRC;
let revealSrc = REVEAL_DEFAULT_SRC;

function createBGM(src: string): HTMLAudioElement {
  const a = new Audio(src);
  a.loop = true;
  a.volume = BGM_VOLUME;
  return a;
}

function getBGM(): HTMLAudioElement {
  if (!bgmAudio) {
    bgmAudio = createBGM(bgmSrc);
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
  setSoundUrls: (urls: { bgmSrc?: string; revealSrc?: string }) => void;
}

export const useSoundStore = create<SoundState>((set, get) => ({
  muted: getInitialMuted(),

  setSoundUrls: (urls) => {
    const nextBgmSrc = urls.bgmSrc ?? BGM_DEFAULT_SRC;
    const nextRevealSrc = urls.revealSrc ?? REVEAL_DEFAULT_SRC;

    const bgmChanged = nextBgmSrc !== bgmSrc;
    const revealChanged = nextRevealSrc !== revealSrc;

    if (!bgmChanged && !revealChanged) return;

    bgmSrc = nextBgmSrc;
    revealSrc = nextRevealSrc;

    // If BGM URL changed, recreate the audio element so the new theme plays.
    if (bgmChanged) {
      if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
      }
      bgmAudio = null;
    }

    // If we're currently unmuted, restart BGM so the change is audible immediately.
    if (!get().muted && bgmChanged) {
      const bgm = getBGM();
      bgm.volume = BGM_VOLUME;
      bgm.play().catch(() => {});
    }
  },

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
    const a = new Audio(revealSrc);
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
