"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  ghostEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setGhostEnabled: (enabled: boolean) => void;
}

/** Audio + gameplay preferences, persisted to localStorage. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      musicEnabled: false,
      volume: 0.7,
      ghostEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setGhostEnabled: (ghostEnabled) => set({ ghostEnabled }),
    }),
    { name: "neon-tetris-settings", version: 1 },
  ),
);
