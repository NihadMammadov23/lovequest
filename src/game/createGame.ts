import type Phaser from "phaser";
import { GAME_H, GAME_W } from "./constants";
import type { GameContext } from "./scenes/BaseScene";

/**
 * Creates the one Phaser game instance. Phaser is imported lazily so it never
 * runs on the server (it touches `window` at import time).
 */
export async function createGame(parent: HTMLElement, ctx: GameContext): Promise<Phaser.Game> {
  const PhaserLib = await import("phaser");
  const [{ BootScene }, { Level1Scene }] = await Promise.all([import("./scenes/BootScene"), import("./scenes/Level1Scene")]);
  const { extraScenes } = await import("./scenes/registry");

  const game = new PhaserLib.Game({
    type: PhaserLib.AUTO,
    parent,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: "#140a2e",
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    audio: { noAudio: true },
    input: { keyboard: false, gamepad: false, mouse: true, touch: true },
    scale: { mode: PhaserLib.Scale.FIT, autoCenter: PhaserLib.Scale.CENTER_BOTH },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [BootScene, Level1Scene, ...extraScenes],
  });
  game.registry.set("ctx", ctx);
  return game;
}
