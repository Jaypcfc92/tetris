"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface HighScoreEntry {
  readonly id: string;
  readonly score: number;
  readonly lines: number;
  readonly level: number;
  readonly date: string;
}

interface HighScoresState {
  entries: HighScoreEntry[];
  addEntry: (entry: Omit<HighScoreEntry, "id" | "date">) => HighScoreEntry;
  clear: () => void;
}

const MAX_ENTRIES = 10;

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Top-10 local high scores, persisted to localStorage. */
export const useHighScoresStore = create<HighScoresState>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (entry) => {
        const record: HighScoreEntry = {
          ...entry,
          id: makeId(),
          date: new Date().toISOString(),
        };
        const entries = [...get().entries, record]
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_ENTRIES);
        set({ entries });
        return record;
      },
      clear: () => set({ entries: [] }),
    }),
    { name: "neon-tetris-highscores", version: 1 },
  ),
);

/** Highest score on record, or 0 when the board is empty. */
export function topScore(entries: readonly HighScoreEntry[]): number {
  return entries[0]?.score ?? 0;
}
