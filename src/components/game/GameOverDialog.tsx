"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { gameCommands } from "@/game/phaser/controllerRef";
import { useGameStore } from "@/store/gameStore";
import { useHighScoresStore } from "@/store/highScoresStore";

/** End-of-run summary with rank in the local top 10. */
export function GameOverDialog(): React.ReactElement {
  const score = useGameStore((state) => state.score);
  const lines = useGameStore((state) => state.lines);
  const level = useGameStore((state) => state.level);
  const entries = useHighScoresStore((state) => state.entries);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    const index = entries.findIndex((entry) => entry.score === score && score > 0);
    setRank(index >= 0 ? index + 1 : null);
  }, [entries, score]);

  return (
    <Dialog open onOpenChange={() => gameCommands.restart()}>
      <DialogContent className="glass-strong border-fuchsia-400/25 sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-center font-heading text-2xl font-black tracking-[0.2em] text-fuchsia-300 text-glow-magenta">
            GAME OVER
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {rank === 1
              ? "New high score — you own the board."
              : rank !== null
                ? `Ranked #${rank} on the local board.`
                : "The stack reached the sky."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 py-2">
          <SummaryTile label="Score" value={score.toLocaleString()} accent="text-cyan-300" />
          <SummaryTile label="Lines" value={lines.toString()} accent="text-emerald-300" />
          <SummaryTile label="Level" value={level.toString()} accent="text-fuchsia-300" />
        </div>

        <DialogFooter className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={gameCommands.restart}
            className="rounded-xl border border-cyan-300/40 bg-cyan-400/10 px-8 py-2.5 font-heading text-sm font-bold tracking-[0.25em] text-cyan-200 transition-all hover:scale-105 hover:bg-cyan-400/20 active:scale-95"
          >
            PLAY AGAIN
          </button>
        </DialogFooter>
        <p className="text-center text-xs text-muted-foreground">Enter or R to restart</p>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({
  label,
  value,
  accent,
}: {
  readonly label: string;
  readonly value: string;
  readonly accent: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-2 text-center">
      <p className="font-heading text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className={`font-heading text-lg font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
