"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import type { GameConfig } from "@/config/gameConfig";
import type { Equipped } from "@/lib/types";
import type { GameBus } from "@/game/bus";
import { createGame } from "@/game/createGame";
import type { InputManager } from "@/game/input";

interface Props {
  scene: string;
  data?: Record<string, unknown>;
  config: GameConfig;
  equipped: Equipped;
  bus: GameBus;
  input: InputManager;
}

/**
 * Owns exactly one Phaser.Game and destroys it on unmount. The bus is owned (and cleared) by the parent,
 * because React StrictMode mounts, unmounts and re-mounts effects in development.
 */
export default function PhaserHost({ scene, data, config, equipped, bus, input }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;
    let cancelled = false;
    let game: Phaser.Game | null = null;

    input.attach();
    createGame(parent, { bus, input, config, equipped, start: { key: scene, data } }).then((g) => {
      if (cancelled) {
        g.destroy(true);
        return;
      }
      game = g;
      (window as unknown as { __lqGame?: Phaser.Game }).__lqGame = g;
    });

    return () => {
      cancelled = true;
      input.detach();
      if (game) {
        game.destroy(true);
        game = null;
      }
      delete (window as unknown as { __lqGame?: Phaser.Game }).__lqGame;
    };
    // The game is created once per mount; the parent remounts it (via `key`) to change scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={parentRef} className="pixel-canvas h-full w-full" aria-label="Game canvas" role="application" />;
}
