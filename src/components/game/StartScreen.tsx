"use client";

import { gameCommands } from "@/game/phaser/controllerRef";
import { useGameStore } from "@/store/gameStore";

/** Landing overlay before the first game. */
export function StartScreen(): React.ReactElement {
  const bestScore = useGameStore((state) => state.bestScore);

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 rounded-xl bg-[#05060f]/80 backdrop-blur-md">
      <div className="text-center">
        <h1 className="animate-title-glow font-heading text-4xl font-black tracking-[0.15em] text-cyan-300 sm:text-5xl">
          NEON
        </h1>
        <h1 className="animate-title-glow font-heading text-4xl font-black tracking-[0.3em] text-fuchsia-300 sm:text-5xl">
          TETRIS
        </h1>
      </div>
      <p className="-mt-3 max-w-[260px] text-center text-sm text-muted-foreground">
        Stack clean. Clear lines. Chase the glow.
      </p>
      <button
        type="button"
        onClick={gameCommands.start}
        className="rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-10 py-3 font-heading text-lg font-bold tracking-[0.25em] text-cyan-200 text-glow-cyan transition-all duration-200 hover:scale-105 hover:bg-cyan-400/20 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none active:scale-95"
      >
        START
      </button>
      {bestScore > 0 ? (
        <p className="font-heading text-xs tracking-[0.2em] text-muted-foreground">
          BEST {bestScore.toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
