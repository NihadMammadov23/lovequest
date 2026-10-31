import * as Phaser from "phaser";
import type { GameConfig } from "@/config/gameConfig";
import { audio, type SfxName } from "@/lib/audio";
import { fmt, type TextVars } from "@/lib/text";
import type { Equipped } from "@/lib/types";
import { GameBus, type DialoguePayload, type HudState } from "../bus";
import { FONT, GAME_H, GAME_W } from "../constants";
import type { InputManager } from "../input";

/** Everything the React side hands to Phaser. Stored in `game.registry` under "ctx". */
export interface GameContext {
  bus: GameBus;
  input: InputManager;
  config: GameConfig;
  equipped: Equipped;
  /** Scene to start after boot and its data. */
  start: { key: string; data?: Record<string, unknown> };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export abstract class BaseScene extends Phaser.Scene {
  protected ctx!: GameContext;
  protected bus!: GameBus;
  protected inp!: InputManager;
  protected cfg!: GameConfig;
  protected vars!: TextVars;
  protected finished = false;
  protected elapsed = 0; // seconds of active play
  private unsubs: (() => void)[] = [];
  private dialogueOpen = false;

  init(): void {
    this.ctx = this.game.registry.get("ctx") as GameContext;
    this.bus = this.ctx.bus;
    this.inp = this.ctx.input;
    this.cfg = this.ctx.config;
    this.vars = {
      girlfriend: this.cfg.girlfriend.name,
      boyfriend: this.cfg.boyfriend.name,
      anniversary: this.cfg.anniversary.display,
    };
    this.finished = false;
    this.elapsed = 0;
    this.dialogueOpen = false;
  }

  /** Call from create(). Wires pause/resume/restart and cleans up on shutdown. */
  protected bindCommon(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [
      this.bus.on("pause", () => {
        if (this.scene.isActive()) this.scene.pause();
      }),
      this.bus.on("resume", () => {
        if (!this.dialogueOpen && this.scene.isPaused()) this.scene.resume();
      }),
      this.bus.on("restart", () => {
        this.dialogueOpen = false;
        this.inp.reset();
        this.scene.restart();
      }),
    ];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      this.unsubs = [];
    });
    this.bus.emit("ready");
  }

  protected t(text: string): string {
    return fmt(text, this.vars);
  }

  protected sfx(name: SfxName): void {
    audio.sfx(name);
  }

  protected hud(state: HudState): void {
    this.bus.emit("hud", state);
  }

  protected toast(text: string): void {
    this.bus.emit("toast", { text });
  }

  protected shake(intensity = 0.004, ms = 140): void {
    if (prefersReducedMotion()) return;
    this.cameras.main.shake(ms, intensity);
  }

  /** Pauses the scene and shows an HTML dialogue; resumes when the player closes it. */
  protected showDialogue(payload: DialoguePayload): void {
    if (this.dialogueOpen) return;
    this.dialogueOpen = true;
    this.inp.reset();
    const off = this.bus.on("dialogueClosed", () => {
      off();
      this.dialogueOpen = false;
      if (this.scene.isPaused()) this.scene.resume();
    });
    this.scene.pause();
    this.bus.emit("dialogue", { title: this.t(payload.title), text: this.t(payload.text) });
  }

  protected burst(x: number, y: number, tints: number[], count = 10, speed = 90): void {
    if (prefersReducedMotion()) count = Math.ceil(count / 3);
    const emitter = this.add.particles(x, y, "px", {
      speed: { min: speed * 0.4, max: speed },
      angle: { min: 0, max: 360 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 1, end: 0 },
      gravityY: 140,
      tint: tints,
      emitting: false,
    });
    emitter.setDepth(50);
    emitter.explode(count);
    this.time.delayedCall(800, () => emitter.destroy());
  }

  protected popup(x: number, y: number, text: string, color = "#ffe94d"): void {
    const label = this.add
      .text(x, y, text, { fontFamily: FONT, fontSize: "8px", color, stroke: "#140a2e", strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({ targets: label, y: y - 18, alpha: 0, duration: 800, ease: "Cubic.easeOut", onComplete: () => label.destroy() });
  }

  protected label(x: number, y: number, text: string, size = 8, color = "#ffffff"): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: "#140a2e", strokeThickness: 3, align: "center" })
      .setOrigin(0.5);
  }

  protected addBackdrop(layers = 3, alphas = [1, 0.85, 0.7]): Phaser.GameObjects.TileSprite[] {
    this.add.image(0, 0, "sky").setOrigin(0).setScrollFactor(0).setDepth(-40);
    const out: Phaser.GameObjects.TileSprite[] = [];
    for (let i = 0; i < layers; i++) {
      const ts = this.add.tileSprite(0, 0, GAME_W, GAME_H, `clouds${i}`).setOrigin(0).setScrollFactor(0).setDepth(-30 + i);
      ts.setAlpha(alphas[i] ?? 0.7);
      out.push(ts);
    }
    return out;
  }

  /** Large centred banner text (e.g. "GO!"). */
  protected banner(text: string, color = "#ffe94d", ms = 900): void {
    const b = this.add
      .text(GAME_W / 2, GAME_H / 2 - 20, text, { fontFamily: FONT, fontSize: "16px", color, stroke: "#140a2e", strokeThickness: 5 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0);
    this.tweens.add({ targets: b, alpha: 1, y: b.y - 6, duration: 200, yoyo: true, hold: ms - 400, onComplete: () => b.destroy() });
  }
}
