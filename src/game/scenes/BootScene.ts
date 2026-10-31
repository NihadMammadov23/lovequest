import * as Phaser from "phaser";
import { registerAnimations, registerTextures } from "../art/registry";
import type { GameContext } from "./BaseScene";

/** Generates all procedural pixel art, then starts the requested scene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    const ctx = this.game.registry.get("ctx") as GameContext;
    registerTextures(this.textures, { config: ctx.config, equipped: ctx.equipped });
    registerAnimations(this.anims);
    this.scene.start(ctx.start.key, ctx.start.data);
  }
}
