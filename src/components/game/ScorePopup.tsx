"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";

/** Floating "TETRIS! +800" banner over the playfield after each scoring lock. */
export function ScorePopup(): React.ReactElement | null {
  const popup = useGameStore((state) => state.popup);
  const setPopup = useGameStore((state) => state.setPopup);

  useEffect(() => {
    if (!popup) return;
    const timer = setTimeout(() => setPopup(null), 1250);
    return () => clearTimeout(timer);
  }, [popup, setPopup]);

  if (!popup) return null;

  return (
    <div
      key={popup.id}
      className="pointer-events-none absolute inset-x-0 top-[18%] z-20 flex flex-col items-center animate-popup"
      role="status"
      aria-live="polite"
    >
      <p
        className={
          popup.lines === 4 || popup.isTSpin
            ? "font-heading text-3xl font-black tracking-wider text-amber-300 text-glow-magenta"
            : "font-heading text-2xl font-bold tracking-wider text-cyan-200 text-glow-cyan"
        }
      >
        {popup.label}
        {popup.lines === 4 || popup.isTSpin ? "!" : ""}
      </p>
      <p className="font-heading text-lg font-bold text-white/90 tabular-nums drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]">
        +{popup.points.toLocaleString()}
      </p>
      {popup.isBackToBack ? (
        <p className="font-heading text-xs font-bold tracking-[0.2em] text-amber-300/90">
          BACK-TO-BACK
        </p>
      ) : null}
      {popup.combo > 0 ? (
        <p className="font-heading text-xs font-bold tracking-[0.2em] text-fuchsia-300/90">
          {popup.combo}-CHAIN
        </p>
      ) : null}
    </div>
  );
}
