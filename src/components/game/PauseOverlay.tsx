"use client";

import { gameCommands } from "@/game/phaser/controllerRef";

/** Pause overlay with resume/restart actions. */
export function PauseOverlay(): React.ReactElement {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 rounded-xl bg-[#05060f]/75 backdrop-blur-md">
      <p className="animate-title-glow font-heading text-3xl font-black tracking-[0.3em] text-cyan-300">
        PAUSED
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={gameCommands.togglePause}
          className="rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-8 py-2.5 font-heading text-sm font-bold tracking-[0.25em] text-cyan-200 transition-all hover:scale-105 hover:bg-cyan-400/20 active:scale-95"
        >
          RESUME
        </button>
        <button
          type="button"
          onClick={gameCommands.restart}
          className="rounded-xl border border-white/15 bg-white/5 px-8 py-2.5 font-heading text-sm font-bold tracking-[0.25em] text-foreground/80 transition-all hover:scale-105 hover:bg-white/10 active:scale-95"
        >
          RESTART
        </button>
      </div>
      <p className="text-xs text-muted-foreground">P or Esc to resume</p>
    </div>
  );
}
