"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { topScore, useHighScoresStore } from "@/store/highScoresStore";
import { Hud } from "./Hud";
import { HoldPanel } from "./HoldPanel";
import { NextQueuePanel } from "./NextQueuePanel";
import { ControlsLegend } from "./ControlsLegend";
import { HighScoresDialog } from "./HighScoresDialog";
import { SettingsDialog } from "./SettingsDialog";
import { PlayfieldArea } from "./PlayfieldArea";

/**
 * Responsive arcade layout:
 *  - desktop: [hold + stats | playfield | next + controls]
 *  - mobile: playfield first, panels stacked below
 */
export function GameShell(): React.ReactElement {
  const setBestScore = useGameStore((state) => state.setBestScore);

  // Mirror the persisted best score into the game store after hydration.
  useEffect(() => {
    setBestScore(topScore(useHighScoresStore.getState().entries));
    const unsubscribe = useHighScoresStore.subscribe((state) => {
      setBestScore(topScore(state.entries));
    });
    return unsubscribe;
  }, [setBestScore]);

  return (
    <main className="flex min-h-dvh flex-col items-center px-3 pt-4 pb-8">
      <header className="mb-4 flex w-full max-w-5xl items-center justify-between gap-3">
        <h1 className="animate-title-glow font-heading text-xl font-black tracking-[0.22em] text-cyan-300 sm:text-2xl">
          NEON<span className="text-fuchsia-300">TETRIS</span>
        </h1>
        <div className="flex gap-2">
          <HighScoresDialog />
          <SettingsDialog />
        </div>
      </header>

      <div className="grid w-full max-w-5xl grid-cols-1 justify-items-center gap-4 lg:grid-cols-[minmax(170px,210px)_minmax(0,420px)_minmax(170px,210px)] lg:items-start lg:justify-items-stretch">
        <aside className="order-2 grid w-full max-w-[420px] grid-cols-2 gap-3 lg:order-1 lg:max-w-none lg:grid-cols-1">
          <HoldPanel />
          <Hud />
        </aside>

        <div className="order-1 w-full lg:order-2">
          <PlayfieldArea />
        </div>

        <aside className="order-3 grid w-full max-w-[420px] grid-cols-2 gap-3 lg:max-w-none lg:grid-cols-1">
          <NextQueuePanel />
          <div className="hidden lg:block">
            <ControlsLegend />
          </div>
        </aside>
      </div>

      <footer className="mt-6 text-center text-xs text-muted-foreground/60">
        Built with Next.js 15 · Phaser 3 · Zustand — swipe or use on-screen controls on mobile
      </footer>
    </main>
  );
}
