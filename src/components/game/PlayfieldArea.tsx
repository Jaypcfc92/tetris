"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { audioManager } from "@/game/audio/audioManager";
import { ScorePopup } from "./ScorePopup";
import { TouchControls } from "./TouchControls";
import { StartScreen } from "./StartScreen";
import { PauseOverlay } from "./PauseOverlay";
import { GameOverDialog } from "./GameOverDialog";

// Phaser touches `window` at import time, so the canvas only ever loads
// client-side.
const PlayfieldCanvas = dynamic(
  () => import("./PlayfieldCanvas").then((module) => module.PlayfieldCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-[1/2] w-full max-w-[420px] items-center justify-center rounded-xl border border-cyan-400/20 bg-[#05060f]/60">
        <p className="animate-pulse font-heading text-xs tracking-[0.3em] text-cyan-300/70">
          BOOTING…
        </p>
      </div>
    ),
  },
);

/** Playfield + overlays + touch controls, framed with a neon edge. */
export function PlayfieldArea(): React.ReactElement {
  const status = useGameStore((state) => state.status);

  // Browsers require a gesture before audio can start.
  useEffect(() => {
    const unlock = (): void => audioManager.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="scanlines relative overflow-hidden rounded-2xl border border-cyan-400/25 box-glow-cyan">
        <PlayfieldCanvas />
      </div>

      <ScorePopup />

      {status === "idle" ? <StartScreen /> : null}
      {status === "paused" ? <PauseOverlay /> : null}
      {status === "gameover" ? <GameOverDialog /> : null}

      <TouchControls />
    </div>
  );
}
