"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { GameController, createGameConfig } from "@/game/phaser/GameController";
import { setActiveController } from "@/game/phaser/controllerRef";

/**
 * Hosts the Phaser canvas. The game boots client-only (this component is
 * rendered with ssr: false) and is torn down cleanly on unmount, which also
 * keeps React StrictMode's double mount in development safe.
 */
export function PlayfieldCanvas(): React.ReactElement {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const controller = new GameController();
    setActiveController(controller);
    const game = new Phaser.Game(
      createGameConfig(parent, controller.engine, controller.getSceneCallbacks()),
    );

    return () => {
      setActiveController(null);
      game.destroy(true);
      controller.destroy();
    };
  }, []);

  return (
    <div
      ref={parentRef}
      className="aspect-[1/2] w-full max-w-[420px] touch-none select-none"
      aria-label="Tetris playfield"
    />
  );
}
