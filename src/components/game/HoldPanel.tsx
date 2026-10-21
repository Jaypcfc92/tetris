"use client";

import { useGameStore } from "@/store/gameStore";
import { NeonPanel } from "./NeonPanel";
import { PiecePreview } from "./PiecePreview";

/** Hold slot: dims while the swap is spent for the current drop. */
export function HoldPanel(): React.ReactElement {
  const hold = useGameStore((state) => state.hold);
  const canHold = useGameStore((state) => state.canHold);
  const status = useGameStore((state) => state.status);

  return (
    <NeonPanel label="Hold" accent={canHold ? "cyan" : "plain"}>
      <div className={status === "playing" && !canHold ? "opacity-45 transition-opacity" : "transition-opacity"}>
        <PiecePreview type={hold} size="md" className="h-14 items-center justify-center" />
      </div>
      <p className="mt-1 text-center font-heading text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
        {canHold ? "C / Shift" : "Used"}
      </p>
    </NeonPanel>
  );
}
