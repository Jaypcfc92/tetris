"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useHighScoresStore } from "@/store/highScoresStore";

const RANK_ACCENTS = ["text-amber-300", "text-slate-200", "text-amber-600"];

/** Local top-10 high scores (persisted in localStorage). */
export function HighScoresDialog(): React.ReactElement {
  const entries = useHighScoresStore((state) => state.entries);
  const clear = useHighScoresStore((state) => state.clear);
  // localStorage-backed state hydrates after mount; avoid SSR mismatch.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="glass gap-1.5 border-amber-400/25 bg-transparent font-heading text-xs tracking-widest text-amber-300 hover:bg-amber-400/10 hover:text-amber-200"
        >
          <Trophy className="h-3.5 w-3.5" />
          SCORES
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-amber-400/25 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold tracking-[0.2em] text-amber-300">
            HIGH SCORES
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Top 10 runs stored on this device.
          </DialogDescription>
        </DialogHeader>

        {hydrated && entries.length > 0 ? (
          <ol className="space-y-1">
            {entries.map((entry, index) => (
              <li
                key={entry.id}
                className="grid grid-cols-[2rem_1fr_auto_auto] items-baseline gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-sm"
              >
                <span className={`font-heading font-bold tabular-nums ${RANK_ACCENTS[index] ?? "text-muted-foreground"}`}>
                  {index + 1}
                </span>
                <span className="font-heading font-bold tabular-nums text-foreground">
                  {entry.score.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  L{entry.level} · {entry.lines} ln
                </span>
                <span className="text-xs text-muted-foreground/70">
                  {new Date(entry.date).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {hydrated ? "No runs yet — clear some lines first." : "Loading…"}
          </p>
        )}

        {hydrated && entries.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="self-end text-xs text-muted-foreground hover:text-destructive"
          >
            Clear board
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
