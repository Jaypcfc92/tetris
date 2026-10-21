"use client";

import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ChevronsDown,
  Pause,
  RotateCcw,
  RotateCw,
  RefreshCcw,
} from "lucide-react";
import { gameCommands } from "@/game/phaser/controllerRef";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";

interface ButtonProps {
  readonly label: string;
  readonly onPress: () => void;
  readonly onRelease?: () => void;
  readonly children: React.ReactNode;
  readonly wide?: boolean;
}

function ControlButton({ label, onPress, onRelease, children, wide }: ButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        onPress();
      }}
      onPointerUp={() => onRelease?.()}
      onPointerCancel={() => onRelease?.()}
      onPointerLeave={() => onRelease?.()}
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        "glass flex touch-none select-none items-center justify-center rounded-xl text-cyan-200/90",
        "h-14 active:scale-95 active:bg-cyan-400/15 active:text-cyan-100",
        "transition-transform duration-75 focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:outline-none",
        wide ? "col-span-2" : "",
      )}
    >
      {children}
    </button>
  );
}

/**
 * On-screen controls for touch devices (shown whenever hover is unavailable,
 * e.g. phones and tablets). Held buttons keep firing via DAS in the engine.
 */
export function TouchControls(): React.ReactElement {
  const status = useGameStore((state) => state.status);

  return (
    <div
      className="mt-3 grid w-full grid-cols-4 gap-2 [@media(hover:hover)]:hidden"
      aria-label="Touch controls"
    >
      <ControlButton label="Move left" onPress={gameCommands.moveLeft}>
        <ArrowLeft className="h-6 w-6" />
      </ControlButton>
      <ControlButton
        label="Soft drop"
        onPress={() => gameCommands.setSoftDrop(true)}
        onRelease={() => gameCommands.setSoftDrop(false)}
      >
        <ChevronsDown className="h-6 w-6" />
      </ControlButton>
      <ControlButton label="Move right" onPress={gameCommands.moveRight}>
        <ArrowRight className="h-6 w-6" />
      </ControlButton>
      <ControlButton
        label={status === "playing" ? "Pause" : "Resume"}
        onPress={gameCommands.togglePause}
      >
        <Pause className="h-6 w-6" />
      </ControlButton>

      <ControlButton label="Rotate counter-clockwise" onPress={gameCommands.rotateCCW}>
        <RotateCcw className="h-5 w-5" />
      </ControlButton>
      <ControlButton label="Rotate clockwise" onPress={gameCommands.rotateCW}>
        <RotateCw className="h-5 w-5" />
      </ControlButton>
      <ControlButton label="Hard drop" onPress={gameCommands.hardDrop}>
        <ArrowDownToLine className="h-5 w-5" />
      </ControlButton>
      <ControlButton label="Hold piece" onPress={gameCommands.hold}>
        <RefreshCcw className="h-5 w-5" />
      </ControlButton>
    </div>
  );
}
