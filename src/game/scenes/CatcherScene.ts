import * as Phaser from "phaser";
import type { MiniGameId, MiniGameResult, SecretHeartId } from "@/lib/types";
import { GAME_H, GAME_W } from "../constants";
import { BaseScene } from "./BaseScene";

export interface FallingItem {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  kind: string;
  good: boolean;
  /** Spins a little while falling. */
  spin: number;
  secret?: boolean;
}

const FLOOR_Y = 246;
const PLAYER_Y = 232;
const MAX_SPEED = 190;
const ACCEL = 1500;

/**
 * Shared behaviour of the two catching mini-games: countdown, left/right movement,
 * falling items, catching, and the end-of-round result.
 */
export abstract class CatcherScene extends BaseScene {
  protected abstract gameId: MiniGameId;
  protected abstract duration: number;
  protected abstract bannerText: string;
  protected abstract hint: string;

  protected player!: Phaser.GameObjects.Sprite;
  protected items: FallingItem[] = [];
  protected score = 0;
  protected combo = 0;
  protected maxCombo = 0;
  protected caught = 0;
  protected secrets: SecretHeartId[] = [];
  protected started = false;
  protected timeLeft = 0;
  private vx = 0;
  private hudTimer = 0;

  protected abstract spawn(dt: number): void;
  protected abstract onCatch(item: FallingItem): void;
  protected abstract onMiss(item: FallingItem): void;
  protected abstract extraChips(): { label: string; value: string }[];
  protected lives(): { hp: number; maxHp: number } {
    return { hp: 0, maxHp: 0 };
  }

  create(): void {
    this.items = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.caught = 0;
    this.secrets = [];
    this.started = false;
    this.timeLeft = this.duration;
    this.vx = 0;

    this.addBackdrop(3, [0.6, 0.55, 0.5]);
    // Floor strip
    this.add.rectangle(GAME_W / 2, FLOOR_Y + 14, GAME_W, 28, 0x2a0f5c).setDepth(1);
    this.add.rectangle(GAME_W / 2, FLOOR_Y, GAME_W, 3, 0xb79bff).setDepth(1);

    this.player = this.add.sprite(GAME_W / 2, PLAYER_Y, "madina", "win0").setDepth(10);
    this.player.setOrigin(0.5, 0.5);

    this.cameras.main.fadeIn(300, 20, 10, 46);
    this.bindCommon();
    this.emitHud();
    this.runCountdown();
  }

  private runCountdown(): void {
    const hint = this.label(GAME_W / 2, 62, this.hint, 7, "#d9ccff").setDepth(80);
    const steps = ["3", "2", "1", "GO!"];
    steps.forEach((s, i) => {
      this.time.delayedCall(i * 650, () => {
        this.sfx(i === 3 ? "combo" : "warn");
        const t = this.add
          .text(GAME_W / 2, GAME_H / 2 - 20, s, { fontFamily: "'Press Start 2P', monospace", fontSize: s === "GO!" ? "24px" : "32px", color: s === "GO!" ? "#7dffcf" : "#ffe94d", stroke: "#140a2e", strokeThickness: 6 })
          .setOrigin(0.5)
          .setDepth(100);
        this.tweens.add({ targets: t, alpha: 0, scale: 1.5, duration: 600, onComplete: () => t.destroy() });
        if (i === 3) {
          this.started = true;
          this.tweens.add({ targets: hint, alpha: 0, duration: 500, onComplete: () => hint.destroy() });
        }
      });
    });
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.clouds(dt);
    if (this.finished) return;

    const axis = this.started ? this.inp.axisX : 0;
    if (axis !== 0) this.vx = Phaser.Math.Clamp(this.vx + axis * ACCEL * dt, -MAX_SPEED, MAX_SPEED);
    else this.vx *= Math.pow(0.0006, dt);
    if (Math.abs(this.vx) < 4) this.vx = 0;
    this.player.x = Phaser.Math.Clamp(this.player.x + this.vx * dt, 14, GAME_W - 14);
    if (this.player.x <= 14 || this.player.x >= GAME_W - 14) this.vx = 0;
    if (axis !== 0) this.player.setFlipX(axis < 0);
    this.player.y = PLAYER_Y + (Math.abs(this.vx) > 40 ? Math.sin(this.time.now / 45) * 1 : 0);

    if (!this.started) return;

    this.elapsed += dt;
    this.timeLeft = Math.max(0, this.duration - this.elapsed);
    this.spawn(dt);
    this.moveItems(dt);

    this.hudTimer += delta;
    if (this.hudTimer > 100) {
      this.hudTimer = 0;
      this.emitHud();
    }
    if (this.timeLeft <= 0) this.end("TIME!");
  }

  private bg: Phaser.GameObjects.TileSprite[] | null = null;
  private clouds(dt: number): void {
    if (!this.bg) this.bg = this.children.list.filter((c): c is Phaser.GameObjects.TileSprite => c instanceof Phaser.GameObjects.TileSprite);
    this.bg.forEach((c, i) => (c.tilePositionX += dt * (4 + i * 3)));
  }

  protected addItem(kind: string, x: number, vy: number, good: boolean, opts: { vx?: number; scale?: number; secret?: boolean } = {}): FallingItem {
    const img = this.add.image(x, -12, kind).setDepth(8).setScale(opts.scale ?? 1);
    const it: FallingItem = { img, vx: opts.vx ?? 0, vy, kind, good, spin: (Math.random() - 0.5) * 1.2, secret: opts.secret };
    this.items.push(it);
    return it;
  }

  private moveItems(dt: number): void {
    const px = this.player.x;
    const catchY = PLAYER_Y - 10;
    this.items = this.items.filter((it) => {
      it.img.y += it.vy * dt;
      it.img.x += it.vx * dt;
      it.img.rotation += it.spin * dt;
      if (it.img.x < 8 || it.img.x > GAME_W - 8) it.vx = -it.vx;
      const half = it.img.displayWidth / 2;
      const caught = Math.abs(it.img.x - px) < 13 + half * 0.6 && it.img.y > catchY - 6 && it.img.y < catchY + 16;
      if (caught) {
        this.onCatch(it);
        it.img.destroy();
        return false;
      }
      if (it.img.y > FLOOR_Y - 4) {
        this.onMiss(it);
        this.burst(it.img.x, FLOOR_Y - 2, [0xd9ccff, 0xa98bff], 3, 30);
        it.img.destroy();
        return false;
      }
      return true;
    });
  }

  protected addScore(points: number, x: number, y: number, color = "#ffe94d"): void {
    this.score = Math.max(0, this.score + points);
    this.popup(x, y, points >= 0 ? `+${points}` : `${points}`, color);
  }

  protected bump(): void {
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    if (this.combo > 0 && this.combo % 5 === 0) {
      this.sfx("combo");
      this.popup(this.player.x, this.player.y - 30, `COMBO x${this.combo}`, "#7dffcf");
    }
  }

  protected end(text: string): void {
    if (this.finished) return;
    this.finished = true;
    this.inp.reset();
    this.items.forEach((i) => i.img.destroy());
    this.items = [];
    this.sfx("win");
    this.banner(text, "#ffc2d6", 1300);
    this.player.setFrame("win1");
    this.emitHud();
    const result: MiniGameResult = {
      game: this.gameId,
      score: this.score,
      collectibles: this.caught,
      secretHearts: [...this.secrets],
      records: { maxCombo: this.maxCombo },
    };
    this.time.delayedCall(1500, () => this.bus.emit("miniGameComplete", result));
  }

  protected emitHud(): void {
    const lives = this.lives();
    this.hud({
      score: this.score,
      hp: lives.hp,
      maxHp: lives.maxHp,
      timeSec: this.timeLeft,
      timeMode: "down",
      chips: [{ label: "Combo", value: `x${this.combo}` }, ...this.extraChips()],
    });
  }
}
