import * as Phaser from "phaser";
import { scoreLevel2 } from "@/lib/scoring";
import { pick, shuffle } from "@/lib/text";
import type { LevelResult } from "@/lib/types";
import type { CardsPayload, QuizPayload } from "../bus";
import { FONT } from "../constants";
import { buildMaze, type MazeLayout, type Pt } from "../maze";
import { BaseScene } from "./BaseScene";

const TILE = 16;
const OX = 8;
const OY = 15;
const SPEED = 72;
const CARD_PAIRS = 6;
const CARD_SECONDS = 75;
const BONUS_TARGET = 6;

type Dir = 1 | -1;

export class MazeScene extends BaseScene {
  constructor() {
    super("Maze");
  }

  private maze!: MazeLayout;
  private player!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private keys = 0;
  private openDoors = new Set<number>();
  private doorSprites = new Map<number, Phaser.GameObjects.Image>();
  private stationSprites = new Map<number, Phaser.GameObjects.Image>();
  private solvedStations = new Set<number>();
  private bonusItems: Phaser.GameObjects.Image[] = [];
  private secretItem: Phaser.GameObjects.Image | null = null;
  private secretFound = false;
  private bonusCollected = 0;
  private correct = 0;
  private quizMistakes = 0;
  private cardMistakes = 0;
  private cardSecondsLeft = 0;
  private busy = false;
  private facing: Dir = 1;
  private hudTimer = 0;
  private hintText?: Phaser.GameObjects.Text;
  private exitX = 0;
  private exitY = 0;

  create(): void {
    this.maze = buildMaze();
    this.keys = 0;
    this.openDoors = new Set();
    this.doorSprites = new Map();
    this.stationSprites = new Map();
    this.solvedStations = new Set();
    this.bonusItems = [];
    this.secretItem = null;
    this.secretFound = false;
    this.bonusCollected = 0;
    this.correct = 0;
    this.quizMistakes = 0;
    this.cardMistakes = 0;
    this.cardSecondsLeft = 0;
    this.busy = false;
    this.facing = 1;

    this.addBackdrop(2, [0.5, 0.4]);
    this.drawMaze();
    this.buildObjects();
    this.buildPlayer();

    this.hintText = this.label(240, 262, "Find the 3 puzzle stations to collect keys, then reach the exit!", 6, "#d9ccff").setDepth(80);
    this.tweens.add({ targets: this.hintText, alpha: 0, delay: 6000, duration: 800 });

    this.cameras.main.fadeIn(350, 20, 10, 46);
    this.bindCommon();
    this.emitHud();
  }

  // ----------------------------------------------------------------- build

  private px(tx: number): number {
    return OX + tx * TILE + TILE / 2;
  }
  private py(ty: number): number {
    return OY + ty * TILE + TILE / 2;
  }

  private drawMaze(): void {
    const { w, h, solid } = this.maze;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (solid[y][x]) {
          // Skip wall tiles that are completely surrounded by wall to keep the look clean (only draw near open space).
          const near = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].some(([dx, dy]) => solid[y + dy]?.[x + dx] === false);
          if (!near) continue;
          this.add.image(OX + x * TILE, OY + y * TILE, "maze_wall").setOrigin(0).setDepth((y + 1) * TILE);
        } else {
          this.add.image(OX + x * TILE, OY + y * TILE, "maze_floor").setOrigin(0).setDepth(-5);
        }
      }
    }
  }

  private buildObjects(): void {
    const m = this.maze;

    m.doors.forEach((d) => {
      const img = this.add.image(this.px(d.x), this.py(d.y), "door").setDepth(this.py(d.y) + 6);
      img.setTint([0xff8fb8, 0x7dffcf, 0xffe94d][d.n - 1]);
      this.doorSprites.set(d.n, img);
    });

    m.stations.forEach((s) => {
      const img = this.add.image(this.px(s.x), this.py(s.y) - 2, s.kind === "quiz" ? "station_quiz" : "station_cards").setDepth(this.py(s.y));
      this.tweens.add({ targets: img, y: img.y - 2, duration: 800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.stationSprites.set(s.n, img);
    });

    m.bonus.forEach((b, i) => {
      const img = this.add.image(this.px(b.x), this.py(b.y), "icecream").setDepth(this.py(b.y));
      this.tweens.add({ targets: img, y: img.y - 2, duration: 600 + i * 40, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.bonusItems.push(img);
    });

    this.secretItem = this.add.image(this.px(m.secret.x), this.py(m.secret.y), "heart_gold").setDepth(this.py(m.secret.y));
    this.tweens.add({ targets: this.secretItem, alpha: 0.6, duration: 500, yoyo: true, repeat: -1 });

    this.exitX = this.px(m.exit.x);
    this.exitY = this.py(m.exit.y);
    this.add.image(this.exitX, this.exitY + 8, "arch").setOrigin(0.5, 1).setScale(0.6).setDepth(this.exitY - 2);
    const nihad = this.add.sprite(this.exitX - 6, this.exitY + 2, "nihad", "idle0").setDepth(this.exitY + 3).setScale(0.8);
    nihad.anims.play("nihad-idle");
  }

  private buildPlayer(): void {
    const s = this.maze.start;
    this.shadow = this.add.ellipse(this.px(s.x), this.py(s.y) + 4, 9, 4, 0x000000, 0.35);
    this.player = this.add.sprite(this.px(s.x), this.py(s.y) + 4, "madina", "idle0").setOrigin(0.5, 1);
    this.player.anims.play("madina-idle");
  }

  // ------------------------------------------------------------- collision

  /** Player hitbox is a small rectangle at the feet (position = bottom centre). */
  private blockedAt(x: number, y: number): boolean {
    const hw = 4;
    const top = y - 5;
    for (const [cx, cy] of [
      [x - hw, top],
      [x + hw, top],
      [x - hw, y],
      [x + hw, y],
    ]) {
      const tx = Math.floor((cx - OX) / TILE);
      const ty = Math.floor((cy - OY) / TILE);
      if (this.isSolidTile(tx, ty)) return true;
    }
    return false;
  }

  private isSolidTile(tx: number, ty: number): boolean {
    const m = this.maze;
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
    if (m.solid[ty][tx]) return true;
    const door = m.doors.find((d) => d.x === tx && d.y === ty);
    return !!door && !this.openDoors.has(door.n);
  }

  // ----------------------------------------------------------------- update

  update(_time: number, delta: number): void {
    if (this.finished || this.busy) return;
    const dt = delta / 1000;
    this.elapsed += dt;

    let ax = this.inp.axisX;
    let ay = this.inp.axisY;
    if (ax !== 0 && ay !== 0) {
      ax *= Math.SQRT1_2;
      ay *= Math.SQRT1_2;
    }
    const dx = ax * SPEED * dt;
    const dy = ay * SPEED * dt;
    let { x, y } = this.player;
    if (dx !== 0 && !this.blockedAt(x + dx, y)) x += dx;
    if (dy !== 0 && !this.blockedAt(x, y + dy)) y += dy;
    // Gentle corner assist: nudge toward the corridor centre when sliding along a wall.
    if (dx !== 0 && this.blockedAt(x + dx, y) && dy === 0) {
      const cy = this.py(Math.floor((y - OY) / TILE)) + 4;
      const off = cy - y;
      if (Math.abs(off) <= 4 && !this.blockedAt(x, y + Math.sign(off))) y += Math.sign(off) * Math.min(Math.abs(off), SPEED * dt);
    }
    if (dy !== 0 && this.blockedAt(x, y + dy) && dx === 0) {
      const cx = this.px(Math.floor((x - OX) / TILE));
      const off = cx - x;
      if (Math.abs(off) <= 4 && !this.blockedAt(x + Math.sign(off), y)) x += Math.sign(off) * Math.min(Math.abs(off), SPEED * dt);
    }
    this.player.setPosition(x, y);
    this.shadow.setPosition(x, y - 1);
    this.player.setDepth(y);
    this.shadow.setDepth(y - 1);

    const moving = Math.abs(ax) + Math.abs(ay) > 0;
    if (ax !== 0) this.facing = ax > 0 ? 1 : -1;
    this.player.setFlipX(this.facing < 0);
    const anim = moving ? "madina-run" : "madina-idle";
    if (this.player.anims.currentAnim?.key !== anim) this.player.anims.play(anim, true);

    this.checkInteractions();

    this.hudTimer += delta;
    if (this.hudTimer > 150) {
      this.hudTimer = 0;
      this.emitHud();
    }
  }

  private tileOf(): Pt {
    return { x: Math.floor((this.player.x - OX) / TILE), y: Math.floor((this.player.y - 4 - OY) / TILE) };
  }

  private checkInteractions(): void {
    const t = this.tileOf();
    const near = (tx: number, ty: number, r = 9) => Math.hypot(this.player.x - this.px(tx), this.player.y - 4 - this.py(ty)) < r;

    // Bonus + secret
    this.bonusItems = this.bonusItems.filter((img) => {
      if (Math.hypot(this.player.x - img.x, this.player.y - 4 - img.y) < 9) {
        this.bonusCollected++;
        this.sfx("collect");
        this.burst(img.x, img.y, [0xff8fb8, 0x7dffcf, 0xffffff], 8, 60);
        this.popup(img.x, img.y - 8, "+100", "#7dffcf");
        this.tweens.killTweensOf(img);
        img.destroy();
        return false;
      }
      return true;
    });
    if (this.secretItem && !this.secretFound && near(this.maze.secret.x, this.maze.secret.y)) {
      this.secretFound = true;
      this.sfx("secret");
      this.burst(this.secretItem.x, this.secretItem.y, [0xffe94d, 0xfffbd0, 0xffffff], 18, 110);
      this.tweens.killTweensOf(this.secretItem);
      this.secretItem.destroy();
      this.secretItem = null;
      this.bus.emit("secretHeart", { id: "l2" });
      const mem = this.cfg.memories[2 % this.cfg.memories.length];
      this.showDialogue({ title: mem.title, text: mem.text });
      return;
    }

    // Doors: walk into a door with its key to open it
    for (const d of this.maze.doors) {
      if (this.openDoors.has(d.n)) continue;
      const adj = Math.abs(this.player.x - this.px(d.x)) < 14 && Math.abs(this.player.y - 4 - this.py(d.y)) < 14;
      if (adj && this.keys >= d.n) this.openDoor(d.n);
      else if (adj && this.keys < d.n) this.nudge("Locked! Solve the puzzle station first.");
    }

    // Stations (auto trigger when stepping on them)
    for (const s of this.maze.stations) {
      if (this.solvedStations.has(s.n)) continue;
      if (t.x === s.x && t.y === s.y && near(s.x, s.y, 8)) {
        this.startStation(s.n);
        return;
      }
    }

    // Exit
    if (t.x === this.maze.exit.x && t.y === this.maze.exit.y) this.finish();
  }

  private lastNudge = 0;
  private nudge(text: string): void {
    const now = this.time.now;
    if (now - this.lastNudge < 1800) return;
    this.lastNudge = now;
    this.sfx("warn");
    this.popup(this.player.x, this.player.y - 28, text.toUpperCase(), "#ffc2d6");
  }

  private openDoor(n: number): void {
    this.openDoors.add(n);
    const img = this.doorSprites.get(n);
    this.sfx("door");
    if (img) {
      this.burst(img.x, img.y, [0xffe94d, 0xffffff], 12, 80);
      this.tweens.add({ targets: img, alpha: 0, scaleY: 0.2, duration: 350, onComplete: () => img.destroy() });
    }
    this.popup(this.player.x, this.player.y - 28, "UNLOCKED!", "#ffe94d");
  }

  // --------------------------------------------------------------- stations

  private startStation(n: 1 | 2 | 3): void {
    const station = this.maze.stations.find((s) => s.n === n);
    if (!station) return;
    this.busy = true;
    this.inp.reset();
    this.sfx("click");
    this.scene.pause();

    const off = this.bus.on(station.kind === "quiz" ? "quizResult" : "cardsResult", (res: unknown) => {
      off();
      this.busy = false;
      if (station.kind === "quiz") {
        const r = res as { correct: number; mistakes: number };
        this.correct += r.correct;
        this.quizMistakes += r.mistakes;
      } else {
        const r = res as { mistakes: number; secondsLeft: number };
        this.cardMistakes += r.mistakes;
        this.cardSecondsLeft = r.secondsLeft;
      }
      this.solvedStations.add(n);
      this.keys += 1;
      this.stationSprites.get(n)?.setAlpha(0.45).setTint(0x888899);
      this.sfx("key");
      this.scene.resume();
      this.burst(this.player.x, this.player.y - 14, [0xffe94d, 0xfffbd0], 14, 90);
      this.popup(this.player.x, this.player.y - 30, `KEY ${n}/3`, "#ffe94d");
      this.emitHud();
    });

    if (station.kind === "quiz") this.bus.emit("quiz", this.buildQuiz(n));
    else this.bus.emit("cards", this.buildCards(n));
  }

  private buildQuiz(n: number): QuizPayload {
    const all = this.cfg.quiz;
    const half = Math.ceil(all.length / 2);
    const pool = n === 1 ? all.slice(0, half) : all.slice(half);
    const chosen = shuffle(pool).slice(0, 3);
    return {
      station: String(n),
      title: n === 1 ? "Station 1: How well do you know us?" : "Station 3: Memory lane",
      questions: chosen.map((q) => {
        const order = shuffle(q.options.map((text, i) => ({ text, ok: i === q.correctIndex })));
        return {
          question: this.t(q.question),
          options: order.map((o) => this.t(o.text)),
          correctIndex: order.findIndex((o) => o.ok),
          correctReaction: this.t(q.correctReaction ?? pick(this.cfg.correctReactions)),
          wrongReaction: this.t(q.wrongReaction ?? pick(this.cfg.incorrectReactions)),
        };
      }),
    };
  }

  private buildCards(n: number): CardsPayload {
    return { station: String(n), title: "Station 2: Match the memories", pairs: CARD_PAIRS, seconds: CARD_SECONDS };
  }

  // ----------------------------------------------------------------- finish

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.inp.reset();
    this.player.anims.play("madina-win");
    this.sfx("win");
    this.burst(this.exitX, this.exitY - 10, [0xff5c8a, 0xffe94d, 0x7dffcf, 0xffc2d6], 40, 130);
    this.banner("MAZE CLEAR!", "#7dffcf", 1400);

    const timeSec = Math.round(this.elapsed);
    const mistakes = this.quizMistakes + this.cardMistakes;
    const collectibles = this.bonusCollected + (this.secretFound ? 1 : 0);
    const score = scoreLevel2({
      correct: this.correct,
      quizMistakes: this.quizMistakes,
      cardMistakes: this.cardMistakes,
      cardSecondsLeft: this.cardSecondsLeft,
      collectibles: this.bonusCollected,
      timeSec,
    });
    const result: LevelResult = {
      level: 2,
      score,
      timeSec,
      collectibles,
      perfect: mistakes === 0,
      secretHearts: this.secretFound ? ["l2"] : [],
      records: { l2Mistakes: mistakes },
      detail: {
        correct: this.correct,
        quizMistakes: this.quizMistakes,
        cardMistakes: this.cardMistakes,
        bonus: this.bonusCollected,
      },
    };
    this.time.delayedCall(1700, () => this.bus.emit("levelComplete", result));
  }

  private emitHud(): void {
    const cards = this.solvedStations.has(2) ? Math.max(0, 300 - this.cardMistakes * 25) + Math.round(this.cardSecondsLeft) * 3 : 0;
    const live = this.correct * 150 - this.quizMistakes * 50 + this.bonusCollected * 100 + cards;
    this.hud({
      score: Math.max(0, live),
      hp: 0,
      maxHp: 0,
      timeSec: this.elapsed,
      chips: [
        { label: "Keys", value: `${this.keys}/3` },
        { label: "Sweets", value: `${this.bonusCollected}/${Math.min(BONUS_TARGET, this.maze.bonus.length)}` },
        { label: "Oops", value: String(this.quizMistakes + this.cardMistakes) },
      ],
    });
  }
}

void FONT;
