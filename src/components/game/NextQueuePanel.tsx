"use client";

import { useGameStore } from "@/store/gameStore";
import { NeonPanel } from "./NeonPanel";
import { PiecePreview } from "./PiecePreview";

/** Next-piece queue; the head of the queue is highlighted. */
export function NextQueuePanel(): React.ReactElement {
  const queue = useGameStore((state) => state.queue);

  return (
    <NeonPanel label="Next" accent="magenta">
      <ul className="flex flex-col items-center gap-2">
        {queue.map((type, index) => (
          <li
            key={`${type}-${index}`}
            className={
              index === 0
                ? "scale-110 transition-transform duration-300"
                : "opacity-70 transition-opacity"
            }
          >
            <PiecePreview type={type} size={index === 0 ? "md" : "sm"} className="justify-center" />
          </li>
        ))}
        {queue.length === 0 ? (
          <li className="py-4 font-heading text-xs tracking-widest text-muted-foreground/40">
            ————
          </li>
        ) : null}
      </ul>
    </NeonPanel>
  );
}
