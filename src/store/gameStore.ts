"use client";

import { create } from "zustand";
import type { GameStatus, PieceType } from "@/game/engine";

/** Score popup shown after a lock (e.g. "TETRIS +800"). */
export interface ClearPopup {
  readonly id: number;
  readonly label: string;
  readonly points: number;
  readonly lines: number;
  readonly isTSpin: boolean;
  readonly isBackToBack: boolean;
  readonly combo: number;
}

interface GameState {
  status: GameStatus;
  score: number;
  lines: number;
  level: number;
  combo: number;
  backToBack: boolean;
  hold: PieceType | null;
  canHold: boolean;
  queue: readonly PieceType[];
  popup: ClearPopup | null;
  /** Total score of the best run, mirrored for quick HUD display. */
  bestScore: number;

  setStatus: (status: GameStatus) => void;
  setStats: (stats: { score: number; lines: number; level: number }) => void;
  setCombo: (combo: number, backToBack: boolean) => void;
  setHold: (hold: PieceType | null, canHold: boolean) => void;
  setQueue: (queue: readonly PieceType[]) => void;
  setPopup: (popup: ClearPopup | null) => void;
  setBestScore: (best: number) => void;
  resetRun: () => void;
}

/**
 * UI-facing game state. Written only by the Phaser-side controller in response
 * to engine events, so React re-renders on discrete events, never per frame.
 */
export const useGameStore = create<GameState>()((set) => ({
  status: "idle",
  score: 0,
  lines: 0,
  level: 1,
  combo: -1,
  backToBack: false,
  hold: null,
  canHold: false,
  queue: [],
  popup: null,
  bestScore: 0,

  setStatus: (status) => set({ status }),
  setStats: ({ score, lines, level }) => set({ score, lines, level }),
  setCombo: (combo, backToBack) => set({ combo, backToBack }),
  setHold: (hold, canHold) => set({ hold, canHold }),
  setQueue: (queue) => set({ queue }),
  setPopup: (popup) => set({ popup }),
  setBestScore: (bestScore) => set({ bestScore }),
  resetRun: () =>
    set({
      score: 0,
      lines: 0,
      level: 1,
      combo: -1,
      backToBack: false,
      hold: null,
      canHold: false,
      queue: [],
      popup: null,
    }),
}));
