import * as Phaser from "phaser";
import { BOSS_DODGE_POINTS, bossHitPoints, scoreBoss } from "@/lib/scoring";
import { pick } from "@/lib/text";
import type { LevelResult } from "@/lib/types";
import { GAME_H, GAME_W } from "../constants";
import { BaseScene } from "./BaseScene";

const FLOOR = 232; // top of the ground
const BOSS_MAX_HP = 24;
const PHASE_NAMES = ["Sleepy Mode", "Hungry Mode", "Dramatic Mode"] as const;
const PHASE_LINES = ["Zzz... five more minutes...", "I'm SO hungry I could eat a whole pizza!", "Nobody understands my pain!!"];
const MOODS = ["sleepy", "hungry", "dramatic"] as const;

const GRAVITY = 850;
const RUN_ACCEL = 1000;
const MAX_RUN = 120;
const JUMP_V = -330;
const COYOTE_MS = 100;
const BUFFER_MS = 120;
const INVULN_MS = 1500;
const THROW_COOLDOWN = 380;

type HazardKind = "pillow" | "food" | "pizza" | "wave";

interface Hazard {
  kind: HazardKind;
  obj: Phaser.GameObjects.Image;
  w: number;
  h: number;
  vx: number;
  vy: number;
  g: number;
  hit: boolean;
  dodged: boolean;
  lastSide: number;
  landed: boolean;
}

interface Shot {
  img: Phaser.GameObjects.Image;
}

type AttackName = "pillowRain" | "pillowSweep" | "foodDash" | "pizzaLob" | "shockwave";

export class BossScene extends BaseScene {
  constructor() {
    super("Boss");
  }

  private player!: Phaser.Physics.Arcade.Sprite;
  private boss!: Phaser.GameObjects.Image;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private plats!: Phaser.Physics.Arcade.StaticGroup;

  private hp = 3;
  private bossHp = BOSS_MAX_HP;
  private phase = 0;
  private started = false;
  private transitioning = false;
  private invulnBoss = 0;
  private hazards: Hazard[] = [];
  private shots: Shot[] = [];
  private pending = 0; // scheduled spawns of the running pattern that have not happened yet
  private attacking = false;
  private nextAttackAt = 0;
  private lastAttack: AttackName | null = null;
  private lastThrow = 0;
  private combo = 0;
  private maxCombo = 0;
  private hitScore = 0;
  private hits = 0;
  private dodges = 0;
  private damageTaken = 0;
  private invUntil = 0;
  private stunUntil = 0;
  private facing = 1;
  private lastGrounded = 0;
  private jumpQueuedAt = 0;
  private jumpCut = false;
  private jumpStartAt = 0;
  private slamming = false;
  private secret!: Phaser.GameObjects.Image | null;
  private secretGot = false;
  private bubble: Phaser.GameObjects.Text | null = null;
  private hudTimer = 0;
  private heal: Phaser.GameObjects.Image | null = null;
  private bossBaseX = GAME_W / 2;

  create(): void {
    this.hp = 3;
    this.bossHp = BOSS_MAX_HP;
    this.phase = 0;
    this.started = false;
    this.transitioning = false;
    this.invulnBoss = 0;
    this.hazards = [];
    this.shots = [];
    this.pending = 0;
    this.attacking = false;
    this.nextAttackAt = 0;
    this.lastAttack = null;
    this.lastThrow = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hitScore = 0;
    this.hits = 0;
    this.dodges = 0;
    this.damageTaken = 0;
    this.invUntil = 0;
    this.stunUntil = 0;
    this.facing = 1;
    this.jumpQueuedAt = 0;
    this.slamming = false;
    this.secretGot = false;
    this.bubble = null;
    this.heal = null;
    this.bossBaseX = GAME_W / 2;

    this.physics.world.gravity.y = GRAVITY;
    this.physics.world.setBounds(0, 0, GAME_W, GAME_H + 100);
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.addBackdrop(4, [0.55, 0.5, 0.45, 0.4]);
    this.buildArena();

    this.boss = this.add.image(GAME_W / 2, 74, "boss_sleepy").setScale(2.5).setDepth(5);

    this.player = this.physics.add.sprite(GAME_W / 2, FLOOR - 14, "madina", "idle0");
    this.player.setDepth(10);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(9, 22).setOffset(3.5, 2).setMaxVelocity(MAX_RUN, 600).setDragX(1200);
    this.player.setCollideWorldBounds(true);
    this.player.anims.play("madina-idle");
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.plats);

    this.secret = this.add.image(120, 90, "heart_gold").setDepth(4);
    this.tweens.add({ targets: this.secret, y: 87, duration: 600, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.secret, alpha: 0.6, duration: 500, yoyo: true, repeat: -1 });

    this.cameras.main.fadeIn(400, 20, 10, 46);
    this.bindCommon();
    this.emitHud();

    this.time.delayedCall(400, () => this.banner("BOSS FIGHT!", "#ff8a7a", 1500));
    this.time.delayedCall(1100, () => this.say(`${this.cfg.boyfriend.name}: ${PHASE_LINES[0]}`));
    this.time.delayedCall(2200, () => {
      this.started = true;
      this.nextAttackAt = this.time.now + 600;
      this.toast("Throw ice cream with J / K / E / Shift (or the B button)!");
    });
  }

  // ------------------------------------------------------------------ build

  private buildArena(): void {
    this.ground = this.physics.add.staticGroup();
    const g = this.ground.create(GAME_W / 2, FLOOR + (GAME_H - FLOOR) / 2 + 3, "ground_480") as Phaser.Physics.Arcade.Image;
    g.refreshBody();
    this.plats = this.physics.add.staticGroup();
    const platDefs: [number, number, number][] = [
      [56, 190, 64],
      [360, 190, 64],
      [150, 148, 48],
      [282, 148, 48],
      [92, 104, 48],
    ];
    platDefs.forEach(([x, y, w]) => {
      const img = this.plats.create(x + w / 2, y + 6, `cloudp_${w}`) as Phaser.Physics.Arcade.Image;
      img.refreshBody();
      const b = img.body as Phaser.Physics.Arcade.StaticBody;
      b.checkCollision.down = false;
      b.checkCollision.left = false;
      b.checkCollision.right = false;
    });
  }

  // ----------------------------------------------------------------- update

  update(_time: number, delta: number): void {
    if (this.finished) return;
    const dt = delta / 1000;
    const now = this.time.now;
    if (this.started) this.elapsed += dt;

    this.movePlayer(now);
    this.moveBoss(dt);
    this.updateShots(dt);
    this.updateHazards(dt);
    this.updateHeal(dt);
    this.checkSecret();

    if (this.started && !this.transitioning) {
      if (this.attacking && this.pending === 0 && this.hazards.length === 0 && !this.slamming) {
        this.attacking = false;
        this.nextAttackAt = now + [1500, 1200, 950][this.phase];
      }
      if (!this.attacking && now >= this.nextAttackAt) this.startAttack();
      if (this.inp.isDown("action") && now - this.lastThrow > THROW_COOLDOWN) this.throwShot(now);
    }

    this.hudTimer += delta;
    if (this.hudTimer > 100) {
      this.hudTimer = 0;
      this.emitHud();
    }
  }

  private movePlayer(now: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;
    if (grounded) this.lastGrounded = now;
    const stunned = now < this.stunUntil;
    const axis = stunned || !this.started ? 0 : this.inp.axisX;

    if (axis !== 0) {
      body.setAccelerationX(axis * RUN_ACCEL);
      body.setDragX(0);
      this.facing = axis;
    } else {
      body.setAccelerationX(0);
      body.setDragX(grounded ? 1200 : 260);
    }
    if (this.inp.consumePress("jump", BUFFER_MS)) this.jumpQueuedAt = now;
    if (!stunned && this.started && this.jumpQueuedAt && now - this.jumpQueuedAt <= BUFFER_MS && now - this.lastGrounded <= COYOTE_MS) {
      body.setVelocityY(JUMP_V);
      this.jumpQueuedAt = 0;
      this.lastGrounded = -9999;
      this.jumpCut = false;
      this.jumpStartAt = now;
      this.sfx("jump");
    }
    if (!this.jumpCut && body.velocity.y < -120 && now - this.jumpStartAt > 110 && !this.inp.isDown("jump")) {
      body.setVelocityY(body.velocity.y * 0.5);
      this.jumpCut = true;
    }
    if (grounded) this.jumpCut = false;

    this.player.setFlipX(this.facing < 0);
    let anim = "madina-idle";
    if (stunned) anim = "madina-hurt";
    else if (!grounded) anim = "madina-jump";
    else if (Math.abs(body.velocity.x) > 12 && axis !== 0) anim = "madina-run";
    if (this.player.anims.currentAnim?.key !== anim) this.player.anims.play(anim, true);
  }

  private moveBoss(dt: number): void {
    if (this.slamming) return;
    const t = this.time.now / 1000;
    const amp = [70, 95, 120][this.phase];
    const targetX = GAME_W / 2 + Math.sin(t * (0.7 + this.phase * 0.15)) * amp;
    this.bossBaseX += (targetX - this.bossBaseX) * Math.min(1, dt * 3);
    this.boss.x = this.bossBaseX;
    this.boss.y = 74 + Math.sin(t * 2) * 4;
  }

  // --------------------------------------------------------------- shooting

  private throwShot(now: number): void {
    this.lastThrow = now;
    const img = this.add.image(this.player.x, this.player.y - 14, "icecream").setDepth(9);
    this.shots.push({ img });
    this.sfx("shoot");
  }

  private updateShots(dt: number): void {
    this.shots = this.shots.filter((s) => {
      s.img.y -= 260 * dt;
      s.img.rotation = Math.sin(this.time.now / 60) * 0.2;
      const hit =
        !this.transitioning &&
        this.started &&
        Math.abs(s.img.x - this.boss.x) < 26 &&
        Math.abs(s.img.y - this.boss.y) < 28;
      if (hit) {
        this.hitBoss(s.img.x, s.img.y);
        s.img.destroy();
        return false;
      }
      if (s.img.y < -10) {
        this.combo = 0; // a miss breaks the combo
        s.img.destroy();
        return false;
      }
      return true;
    });
  }

  private hitBoss(x: number, y: number): void {
    const now = this.time.now;
    if (now < this.invulnBoss) {
      this.burst(x, y, [0xffffff], 3, 40);
      return;
    }
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const pts = bossHitPoints(this.combo - 1);
    this.hitScore += pts;
    this.hits += 1;
    this.bossHp -= 1;
    this.sfx("hit");
    this.burst(x, y, [0xffd2a8, 0xff8fb8, 0xffffff], 8, 80);
    this.popup(x, y - 10, `+${pts}`, "#ffe94d");
    if (this.combo > 0 && this.combo % 5 === 0) {
      this.sfx("combo");
      this.popup(this.player.x, this.player.y - 34, `COMBO x${this.combo}`, "#7dffcf");
    }
    this.boss.setTint(0xffaaaa);
    this.time.delayedCall(90, () => this.boss.clearTint());
    this.tweens.add({ targets: this.boss, scaleX: 2.8, scaleY: 2.2, duration: 70, yoyo: true });
    this.shake(0.003, 90);

    if (this.bossHp <= 0) {
      this.defeatBoss();
      return;
    }
    const newPhase = this.bossHp > 16 ? 0 : this.bossHp > 8 ? 1 : 2;
    if (newPhase !== this.phase) this.changePhase(newPhase);
  }

  // ----------------------------------------------------------------- phases

  private changePhase(newPhase: number): void {
    this.transitioning = true;
    this.phase = newPhase;
    this.attacking = false;
    this.pending = 0;
    this.slamming = false;
    // Clear everything on screen so the player always gets a clean breather.
    this.hazards.forEach((h) => {
      this.tweens.add({ targets: h.obj, alpha: 0, duration: 250, onComplete: () => h.obj.destroy() });
    });
    this.hazards = [];
    this.time.removeAllEvents();
    this.invulnBoss = this.time.now + 1800;
    this.boss.setTexture(`boss_${MOODS[newPhase]}`);
    this.sfx("warn");
    this.shake(0.006, 260);
    this.banner(PHASE_NAMES[newPhase].toUpperCase() + "!", newPhase === 1 ? "#ffd2a8" : "#a8d8ff", 1500);
    this.say(`${this.cfg.boyfriend.name}: ${PHASE_LINES[newPhase]}`);
    if (newPhase === 2 && this.cfg.insideJokes.length) this.time.delayedCall(1600, () => this.toast(this.t(pick(this.cfg.insideJokes))));
    this.dropHeal();
    this.time.delayedCall(1800, () => {
      this.transitioning = false;
      this.nextAttackAt = this.time.now + 400;
    });
  }

  private say(text: string): void {
    this.bubble?.destroy();
    const b = this.add
      .text(GAME_W / 2, 118, text, { fontFamily: "'Press Start 2P', monospace", fontSize: "7px", color: "#ffffff", backgroundColor: "#140a2eaa", padding: { x: 5, y: 3 }, align: "center", wordWrap: { width: 380 } })
      .setOrigin(0.5)
      .setDepth(70);
    this.bubble = b;
    this.tweens.add({ targets: b, alpha: 0, delay: 2200, duration: 500, onComplete: () => b.destroy() });
  }

  private dropHeal(): void {
    if (this.heal) this.heal.destroy();
    this.heal = this.add.image(GAME_W / 2, 20, "heart").setScale(2).setDepth(7);
  }

  private updateHeal(dt: number): void {
    if (!this.heal) return;
    this.heal.y = Math.min(FLOOR - 10, this.heal.y + 55 * dt);
    if (Math.abs(this.heal.x - this.player.x) < 14 && Math.abs(this.heal.y - this.player.y) < 20) {
      if (this.hp < 3) {
        this.hp += 1;
        this.popup(this.heal.x, this.heal.y - 8, "+1 HEART", "#ffc2d6");
      } else this.popup(this.heal.x, this.heal.y - 8, "+100", "#ffc2d6");
      if (this.hp >= 3) this.hitScore += 0;
      this.sfx("collect");
      this.burst(this.heal.x, this.heal.y, [0xff5c8a, 0xffc2d6], 8, 70);
      this.heal.destroy();
      this.heal = null;
    }
  }

  private checkSecret(): void {
    if (!this.secret || this.secretGot) return;
    if (Math.abs(this.secret.x - this.player.x) < 12 && Math.abs(this.secret.y - this.player.y) < 18) {
      this.secretGot = true;
      this.tweens.killTweensOf(this.secret);
      this.burst(this.secret.x, this.secret.y, [0xffe94d, 0xfffbd0, 0xffffff], 18, 110);
      this.secret.destroy();
      this.secret = null;
      this.sfx("secret");
      this.bus.emit("secretHeart", { id: "l4" });
      const mem = this.cfg.memories[3 % this.cfg.memories.length];
      this.showDialogue({ title: mem.title, text: mem.text });
    }
  }

  // ---------------------------------------------------------------- attacks

  private startAttack(): void {
    const pools: AttackName[][] = [
      ["pillowRain", "pillowSweep", "pillowRain"],
      ["foodDash", "pizzaLob", "foodDash", "pizzaLob"],
      ["pillowRain", "foodDash", "pizzaLob", "shockwave", "shockwave"],
    ];
    let choice = pick(pools[this.phase]);
    if (choice === this.lastAttack) choice = pick(pools[this.phase]);
    this.lastAttack = choice;
    this.attacking = true;
    this[choice]();
  }

  private after(ms: number, fn: () => void): void {
    this.pending += 1;
    this.time.delayedCall(ms, () => {
      this.pending -= 1;
      if (!this.finished && !this.transitioning) fn();
    });
  }

  private lanes(count: number, total = 8, maxRun = 2): number[] {
    // Pick `count` lanes so that no more than `maxRun` are adjacent (always leaves a gap to run to).
    const all = Array.from({ length: total }, (_, i) => i).sort(() => Math.random() - 0.5);
    const out: number[] = [];
    for (const l of all) {
      if (out.length >= count) break;
      const trial = [...out, l].sort((a, b) => a - b);
      let run = 1;
      let best = 1;
      for (let i = 1; i < trial.length; i++) {
        run = trial[i] === trial[i - 1] + 1 ? run + 1 : 1;
        best = Math.max(best, run);
      }
      if (best <= maxRun) out.push(l);
    }
    return out;
  }

  private warnMarker(x: number, y: number, ms: number, key = "warn"): void {
    const m = this.add.image(x, y, key).setDepth(30);
    this.tweens.add({ targets: m, alpha: 0.2, duration: 110, yoyo: true, repeat: Math.floor(ms / 220) });
    this.time.delayedCall(ms, () => m.destroy());
    this.sfx("warn");
  }

  private spawnPillow(x: number, speed: number): void {
    const img = this.add.image(x, -12, "pillow").setDepth(8);
    this.hazards.push(this.hazard("pillow", img, 20, 11, 0, speed, 0));
  }

  private hazard(kind: HazardKind, obj: Phaser.GameObjects.Image, w: number, h: number, vx: number, vy: number, g: number): Hazard {
    return { kind, obj, w, h, vx, vy, g, hit: false, dodged: false, lastSide: Math.sign(obj.x - this.player.x), landed: false };
  }

  private pillowRain(): void {
    const waves = this.phase === 0 ? 3 : 2;
    const perWave = this.phase === 0 ? 3 : 3;
    const laneW = GAME_W / 8;
    for (let w = 0; w < waves; w++) {
      this.after(w * 1500, () => {
        // Lane centres get a little jitter, and one pillow is aimed at where the player stands,
        // so standing still on a lane boundary is never a safe strategy.
        const xs = this.lanes(perWave).map((l) => l * laneW + laneW / 2 + Phaser.Math.Between(-18, 18));
        if (xs.length > 0) xs[0] = Phaser.Math.Clamp(this.player.x, 16, GAME_W - 16);
        xs.forEach((x) => {
          this.floorWarn(x, 800);
          this.warnMarker(x, 22, 800);
        });
        this.after(850, () => xs.forEach((x) => this.spawnPillow(x, 230)));
      });
    }
  }

  private pillowSweep(): void {
    const laneW = GAME_W / 8;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const order = dir > 0 ? [0, 2, 4, 6] : [7, 5, 3, 1];
    order.forEach((l, i) => {
      this.after(i * 520, () => {
        const x = l * laneW + laneW / 2 + Phaser.Math.Between(-16, 16);
        this.floorWarn(x, 700);
        this.warnMarker(x, 22, 700);
        this.after(720, () => this.spawnPillow(x, 240));
      });
    });
  }

  private floorWarn(x: number, ms: number): void {
    const s = this.add.ellipse(x, FLOOR - 2, 30, 6, 0xff4f6d, 0.55).setDepth(3);
    this.tweens.add({ targets: s, alpha: 0.15, duration: 120, yoyo: true, repeat: Math.floor(ms / 240) });
    this.time.delayedCall(ms + 60, () => s.destroy());
  }

  private foodDash(): void {
    const count = this.phase === 1 ? 4 : 5;
    const speed = this.phase === 1 ? 150 : 185;
    let side = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < count; i++) {
      const low = i % 2 === 0 ? Math.random() < 0.6 : Math.random() < 0.4;
      const s = side;
      side = -side;
      const y = low ? FLOOR - 9 : FLOOR - 40;
      this.after(i * 1250, () => {
        const edgeX = s > 0 ? 12 : GAME_W - 12;
        this.warnMarker(edgeX, y, 800);
        const arrow = this.add
          .text(edgeX + (s > 0 ? 14 : -14), y, low ? (s > 0 ? ">" : "<") : (s > 0 ? ">>" : "<<"), { fontFamily: "'Press Start 2P'", fontSize: "8px", color: "#ff4f6d" })
          .setOrigin(0.5)
          .setDepth(30);
        this.time.delayedCall(800, () => arrow.destroy());
        this.after(820, () => {
          const kind = Math.random() < 0.5 ? "burger" : "drumstick";
          const img = this.add.image(s > 0 ? -12 : GAME_W + 12, y, kind).setDepth(8);
          this.hazards.push(this.hazard("food", img, 12, 9, s * speed, 0, 0));
        });
      });
    }
  }

  private pizzaLob(): void {
    const count = this.phase === 1 ? 3 : 3;
    for (let i = 0; i < count; i++) {
      this.after(i * 1300, () => {
        const tx = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-24, 24), 20, GAME_W - 20);
        const ring = this.add.ellipse(tx, FLOOR - 2, 26, 7, 0xffd84d, 0.5).setStrokeStyle(1, 0xff4f6d).setDepth(3);
        this.tweens.add({ targets: ring, alpha: 0.2, duration: 120, yoyo: true, repeat: 8 });
        this.time.delayedCall(1100, () => ring.destroy());
        this.sfx("warn");
        this.after(300, () => {
          const sx = this.boss.x;
          const sy = this.boss.y + 20;
          const T = 0.9;
          const g = 320;
          const targetY = FLOOR - 8;
          const img = this.add.image(sx, sy, "pizza_big").setDepth(8);
          const h = this.hazard("pizza", img, 12, 12, (tx - sx) / T, (targetY - sy - 0.5 * g * T * T) / T, g);
          this.hazards.push(h);
        });
      });
    }
  }

  private shockwave(): void {
    this.slamming = true;
    this.pending += 1;
    // Boss rises and shakes (telegraph), then slams.
    this.tweens.add({ targets: this.boss, x: GAME_W / 2, y: 50, duration: 500, ease: "Sine.easeInOut" });
    this.bossBaseX = GAME_W / 2;
    this.sfx("warn");
    const label = this.label(GAME_W / 2, 118, "SLAM!", 10, "#ff8a7a").setDepth(40);
    this.tweens.add({ targets: label, alpha: 0.3, duration: 120, yoyo: true, repeat: 8 });
    this.time.delayedCall(1150, () => label.destroy());
    this.tweens.add({ targets: this.boss, x: GAME_W / 2 + 3, duration: 50, yoyo: true, repeat: 18, delay: 500 });
    this.time.delayedCall(1250, () => {
      this.pending -= 1;
      if (this.finished || this.transitioning) {
        this.slamming = false;
        return;
      }
      this.tweens.add({ targets: this.boss, y: 120, duration: 160, ease: "Cubic.easeIn", yoyo: true, onYoyo: () => this.spawnWaves(), onComplete: () => (this.slamming = false) });
    });
    // Second slam in the later half of the fight
    if (this.bossHp <= 6) {
      this.after(2900, () => {
        this.slamming = true;
        this.sfx("warn");
        const l2 = this.label(GAME_W / 2, 118, "SLAM!", 10, "#ff8a7a").setDepth(40);
        this.tweens.add({ targets: l2, alpha: 0.3, duration: 120, yoyo: true, repeat: 6 });
        this.time.delayedCall(900, () => l2.destroy());
        this.after(1000, () => {
          this.tweens.add({ targets: this.boss, y: 120, duration: 160, ease: "Cubic.easeIn", yoyo: true, onYoyo: () => this.spawnWaves(), onComplete: () => (this.slamming = false) });
        });
      });
    }
  }

  private spawnWaves(): void {
    this.shake(0.007, 220);
    this.sfx("hurt");
    const speed = 135;
    for (const dir of [-1, 1]) {
      const img = this.add.image(GAME_W / 2 + dir * 10, FLOOR - 5, "wave").setDepth(8).setFlipX(dir < 0);
      this.hazards.push(this.hazard("wave", img, 10, 10, dir * speed, 0, 0));
    }
  }

  // ----------------------------------------------------------------- hazards

  private updateHazards(dt: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const pr = new Phaser.Geom.Rectangle(body.x + 1, body.y + 1, body.width - 2, body.height - 2);
    const now = this.time.now;

    this.hazards = this.hazards.filter((h) => {
      h.vy += h.g * dt;
      h.obj.x += h.vx * dt;
      h.obj.y += h.vy * dt;
      if (h.kind === "pizza" || h.kind === "pillow") h.obj.rotation += dt * (h.kind === "pizza" ? 5 : 0.6);

      const hr = new Phaser.Geom.Rectangle(h.obj.x - h.w / 2, h.obj.y - h.h / 2, h.w, h.h);
      if (!h.hit && Phaser.Geom.Intersects.RectangleToRectangle(pr, hr)) {
        h.hit = true;
        this.hurt(now, h.obj.x);
        if (h.kind === "food" || h.kind === "pizza") {
          this.burst(h.obj.x, h.obj.y, [0xffd84d, 0xff6b6b], 8, 80);
          h.obj.destroy();
          return false;
        }
      }

      // Near-miss counts as a dodge
      if (!h.hit && !h.dodged) {
        if (h.kind === "food" || h.kind === "wave") {
          const side = Math.sign(h.obj.x - this.player.x);
          if (side !== 0 && side !== h.lastSide && Math.abs(h.obj.y - (this.player.y)) < 40) this.markDodge(h);
          if (side !== 0) h.lastSide = side;
        } else if (h.kind === "pillow") {
          if (h.obj.y > this.player.y && Math.abs(h.obj.x - this.player.x) < 34) this.markDodge(h);
        } else if (h.kind === "pizza") {
          if (h.obj.y > FLOOR - 14 && Math.abs(h.obj.x - this.player.x) < 34) this.markDodge(h);
        }
      }

      // Resolve
      if (h.kind === "pillow" && h.obj.y >= FLOOR - 6) {
        this.burst(h.obj.x, FLOOR - 4, [0xf3ecff, 0xffc2d6], 8, 70);
        h.obj.destroy();
        return false;
      }
      if (h.kind === "pizza" && h.obj.y >= FLOOR - 8 && h.vy > 0) {
        this.burst(h.obj.x, FLOOR - 4, [0xffd84d, 0xd9302f], 8, 70);
        h.obj.destroy();
        return false;
      }
      if ((h.kind === "food" || h.kind === "wave") && (h.obj.x < -24 || h.obj.x > GAME_W + 24)) {
        h.obj.destroy();
        return false;
      }
      return true;
    });
  }

  private markDodge(h: Hazard): void {
    h.dodged = true;
    this.dodges += 1;
    this.popup(this.player.x, this.player.y - 30, "DODGE!", "#7dffcf");
    this.sfx("combo");
  }

  private hurt(now: number, fromX: number): void {
    if (now < this.invUntil || this.finished || this.transitioning) return;
    this.hp -= 1;
    this.damageTaken += 1;
    this.combo = 0;
    this.sfx("hurt");
    this.shake(0.006, 160);
    this.invUntil = now + INVULN_MS;
    this.stunUntil = now + 250;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((this.player.x < fromX ? -1 : 1) * 120, -190);
    this.tweens.killTweensOf(this.player);
    this.player.setAlpha(1);
    this.tweens.add({ targets: this.player, alpha: 0.25, duration: 90, yoyo: true, repeat: Math.floor(INVULN_MS / 180), onComplete: () => this.player.setAlpha(1) });
    this.emitHud();
    if (this.hp <= 0) this.lose();
  }

  private lose(): void {
    if (this.finished) return;
    this.finished = true;
    this.inp.reset();
    this.sfx("lose");
    this.player.anims.play("madina-hurt");
    this.hazards.forEach((h) => h.obj.destroy());
    this.hazards = [];
    this.time.delayedCall(900, () => this.bus.emit("defeat", { reason: `${this.cfg.boyfriend.name} wins this round... but you can try again!` }));
  }

  private defeatBoss(): void {
    if (this.finished) return;
    this.finished = true;
    this.inp.reset();
    this.time.removeAllEvents();
    this.hazards.forEach((h) => h.obj.destroy());
    this.hazards = [];
    this.shots.forEach((s) => s.img.destroy());
    this.shots = [];
    this.boss.setTexture("boss_defeated");
    this.sfx("bossDefeat");
    this.shake(0.01, 500);
    this.banner("BOSS DEFEATED!", "#ffe94d", 2200);
    this.player.setVelocity?.(0, 0);
    this.player.anims.play("madina-win");
    // Harmless, over-the-top exit: spin, squash, fly away.
    this.tweens.add({ targets: this.boss, angle: 720, duration: 1100, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: this.boss, scaleX: 3.2, scaleY: 1.8, duration: 160, yoyo: true, repeat: 3 });
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 220, () => this.burst(this.boss.x + Phaser.Math.Between(-30, 30), this.boss.y + Phaser.Math.Between(-20, 20), [0xff5c8a, 0xffe94d, 0x7dffcf, 0xffffff], 18, 140));
    }
    this.time.delayedCall(1400, () => {
      this.tweens.add({ targets: this.boss, y: -80, x: this.boss.x + 120, angle: 1080, duration: 900, ease: "Cubic.easeIn" });
    });

    const timeSec = Math.round(this.elapsed);
    const score = scoreBoss({ hitPoints: this.hitScore, dodges: this.dodges, hpLeft: this.hp, timeSec });
    const result: LevelResult = {
      level: 4,
      score,
      timeSec,
      collectibles: this.secretGot ? 1 : 0,
      perfect: this.damageTaken === 0,
      secretHearts: this.secretGot ? ["l4"] : [],
      records: { maxCombo: this.maxCombo },
      detail: { hits: this.hits, dodges: this.dodges, hpLeft: this.hp, maxCombo: this.maxCombo },
    };
    this.time.delayedCall(3200, () => this.bus.emit("levelComplete", result));
  }

  private emitHud(): void {
    this.hud({
      score: this.hitScore + this.dodges * BOSS_DODGE_POINTS,
      hp: this.hp,
      maxHp: 3,
      timeSec: this.elapsed,
      chips: [{ label: "Combo", value: `x${this.combo}` }],
      boss: { name: this.cfg.boyfriend.name, ratio: Math.max(0, this.bossHp / BOSS_MAX_HP), phase: PHASE_NAMES[this.phase] },
    });
  }
}
