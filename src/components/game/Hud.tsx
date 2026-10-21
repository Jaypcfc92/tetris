"use client";

import { useGameStore } from "@/store/gameStore";
import { NeonPanel } from "./NeonPanel";
import { useAnimatedNumber } from "./useAnimatedNumber";

/** Score, level, lines and streak badges with a smooth count-up. */
export function Hud(): React.ReactElement {
  const score = useGameStore((state) => state.score);
  const lines = useGameStore((state) => state.lines);
  const level = useGameStore((state) => state.level);
  const combo = useGameStore((state) => state.combo);
  const backToBack = useGameStore((state) => state.backToBack);
  const bestScore = useGameStore((state) => state.bestScore);
  const animatedScore = useAnimatedNumber(score);

  return (
    <NeonPanel label="Score" accent="cyan" className="space-y-2">
      <p
        className="truncate font-heading text-3xl font-bold text-cyan-300 text-glow-cyan tabular-nums"
        aria-live="polite"
      >
        {animatedScore.toLocaleString()}
      </p>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">BEST</span>
        <span className="font-semibold text-foreground/90 tabular-nums">
          {bestScore.toLocaleString()}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Level" value={level} accent="text-fuchsia-300" />
        <StatTile label="Lines" value={lines} accent="text-emerald-300" />
      </div>
      <div className="flex min-h-6 flex-wrap gap-1.5">
        {combo > 0 ? (
          <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 font-heading text-[10px] font-bold tracking-wider text-fuchsia-300">
            COMBO ×{combo}
          </span>
        ) : null}
        {backToBack ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-heading text-[10px] font-bold tracking-wider text-amber-300">
            BACK-TO-BACK
          </span>
        ) : null}
      </div>
    </NeonPanel>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  readonly label: string;
  readonly value: number;
  readonly accent: string;
}): React.ReactElement {
  return (
    <div className="rounded-lg bg-white/5 px-2 py-1.5 text-center">
      <p className="font-heading text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className={["font-heading text-xl font-bold tabular-nums", accent].join(" ")}>{value}</p>
    </div>
  );
}
