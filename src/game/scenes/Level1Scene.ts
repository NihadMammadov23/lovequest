import * as Phaser from "phaser";
import type { LevelResult, SecretHeartId } from "@/lib/types";
import { L1_HEARTS as HEART_TARGET, scoreLevel1 } from "@/lib/scoring";
import { ensureCloud, ensureGround } from "../art/registry";
import { FONT, GAME_H, GAME_W } from "../constants";
import { BaseScene } from "./BaseScene";
import {
  L1_CHECKPOINTS,
  L1_CLOUDS,
  L1_ENEMIES,
  L1_GOAL,
  L1_GROUND,
  L1_HEARTS,
  L1_MOVING,
  L1_SECRETS,
  L1_SPIKES,
  L1_WORLD_W,
} from "./level1Data";

const GRAVITY = 850;
const RUN_ACCEL = 950;
const MAX_RUN = 125;
const GROUND_DRAG = 1200;
const AIR_DRAG = 260;
const JUMP_V = -335;
const COYOTE_MS = 110;
const BUFFER_MS = 120;
const INVULN_MS = 1300;
const HITSTUN_MS = 260;

interface Enemy {
  sprite: Phaser.GameObjects.Sprite;
  minX: number;
  maxX: number;
  speed: number;
  dir: number;
  alive: boolean;
}

export class Level1Scene extends BaseScene {
  constructor() {
    super("Level1");
  }

  private player!: Phaser.Physics.Arcade.Sprite;
  private clouds: Phaser.GameObjects.TileSprite[] = [];
  private movers: { img: Phaser.Physics.Arcade.Image; cfg: (typeof L1_MOVING)[number]; lastX: number }[] = [];
  private hearts: Phaser.GameObjects.Image[] = [];
  private secrets: { id: SecretHeartId; img: Phaser.GameObjects.Image; memory: number; got: boolean }[] = [];
  private spikes: Phaser.Geom.Rectangle[] = [];
  private enemies: Enemy[] = [];
  private flags: { img: Phaser.GameObjects.Image; x: number; y: number; on: boolean }[] = [];
  private nihad!: Phaser.GameObjects.Sprite;

  private hp = 3;
  private deaths = 0;
  private damageTaken = 0;
  private collected = 0;
  private foundSecrets: SecretHeartId[] = [];
  private checkpoint = { x: L1_CHECKPOINTS[0].x, y: L1_CHECKPOINTS[0].y };
  private lastGrounded = 0;
  private jumpQueuedAt = 0;
  private jumpCut = false;
  private jumpStartAt = 0;
  private invUntil = 0;
  private stunUntil = 0;
  private facing = 1;
  private wasGrounded = false;
  private lastVy = 0;
  private riding: Phaser.Physics.Arcade.Image | null = null;
  private hudTimer = 0;

  create(): void {
    this.hp = 3;
    this.deaths = 0;
    this.damageTaken = 0;
    this.collected = 0;
    this.foundSecrets = [];
    this.checkpoint = { x: L1_CHECKPOINTS[0].x, y: L1_CHECKPOINTS[0].y };
    this.invUntil = 0;
    this.stunUntil = 0;
    this.jumpQueuedAt = 0;
    this.hearts = [];
    this.secrets = [];
    this.spikes = [];
    this.enemies = [];
    this.flags = [];
    this.movers = [];
    this.riding = null;
    this.facing = 1;

    this.physics.world.gravity.y = GRAVITY;
    this.physics.world.setBounds(0, 0, L1_WORLD_W, GAME_H + 260);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBounds(0, 0, L1_WORLD_W, GAME_H);
    this.cameras.main.roundPixels = true;

    this.clouds = this.addBackdrop(3, [0.55, 0.5, 0.45]);
    this.buildWorld();
    this.buildPlayer();
    this.buildHazards();
    this.buildCollectibles();
    this.buildGoal();

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(40, 30);
    this.cameras.main.fadeIn(350, 20, 10, 46);

    this.add
      .text(24, 150, "ARROWS / WASD: MOVE\nSPACE / UP: JUMP", { fontFamily: FONT, fontSize: "8px", color: "#d9ccff", align: "left", stroke: "#140a2e", strokeThickness: 3 })
      .setDepth(2);
    this.add
      .text(L1_GOAL.x - 110, 150, `${this.cfg.boyfriend.name} is waiting!`, { fontFamily: FONT, fontSize: "8px", color: "#ffc2d6", stroke: "#140a2e", strokeThickness: 3 })
      .setDepth(2);

    this.bindCommon();
    this.emitHud();
    this.time.delayedCall(300, () => this.banner("GO!"));
  }

  // ------------------------------------------------------------------ build

  private buildWorld(): void {
    const solids = this.physics.add.staticGroup();
    this.groundGroup = solids;
    L1_GROUND.forEach((g) => {
      const h = GAME_H - g.y + 6;
      const key = ensureGround(this.textures, g.w, h);
      const img = solids.create(g.x + g.w / 2, g.y + h / 2, key) as Phaser.Physics.Arcade.Image;
      img.refreshBody();
      // decorative tufts on top
      for (let x = g.x + 14; x < g.x + g.w - 10; x += 38 + ((x * 7) % 23)) {
        this.add.image(x, g.y, "tuft").setOrigin(0.5, 1).setDepth(-1);
      }
    });

    const clouds = this.physics.add.staticGroup();
    this.cloudGroup = clouds;
    L1_CLOUDS.forEach((c) => {
      const key = ensureCloud(this.textures, c.w);
      const img = clouds.create(c.x + c.w / 2, c.y + 6, key) as Phaser.Physics.Arcade.Image;
      img.refreshBody();
      const body = img.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    });

    L1_MOVING.forEach((m) => {
      const key = ensureCloud(this.textures, m.w);
      const img = this.physics.add.image(m.cx, m.y + 6, key);
      const body = img.body as Phaser.Physics.Arcade.Body;
      body.setAllowGravity(false);
      body.setImmovable(true);
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
      img.setTint(0xffd2ec);
      this.movers.push({ img, cfg: m, lastX: m.cx });
    });
  }

  private groundGroup!: Phaser.Physics.Arcade.StaticGroup;
  private cloudGroup!: Phaser.Physics.Arcade.StaticGroup;

  private buildPlayer(): void {
    const s = this.checkpoint;
    this.player = this.physics.add.sprite(s.x, s.y - 14, "madina", "idle0");
    this.player.setDepth(10);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(9, 22);
    body.setOffset(3.5, 2);
    body.setMaxVelocity(MAX_RUN, 600);
    body.setDragX(GROUND_DRAG);
    this.player.setCollideWorldBounds(true);
    this.player.anims.play("madina-idle");

    this.physics.add.collider(this.player, this.groundGroup);
    this.physics.add.collider(this.player, this.cloudGroup);
    this.movers.forEach((m) =>
      this.physics.add.collider(this.player, m.img, () => {
        this.riding = m.img;
      }),
    );
  }

  private buildHazards(): void {
    L1_SPIKES.forEach((s) => {
      for (let i = 0; i < s.n; i++) {
        this.add.image(s.x + i * 16 + 8, s.y, "spike").setOrigin(0.5, 1).setDepth(1);
      }
      this.spikes.push(new Phaser.Geom.Rectangle(s.x + 2, s.y - 7, s.n * 16 - 4, 7));
    });
    L1_ENEMIES.forEach((e) => {
      const sprite = this.add.sprite(e.x, e.y - 7, "cloud_enemy").setDepth(3);
      this.tweens.add({ targets: sprite, scaleY: 0.92, duration: 400, yoyo: true, repeat: -1 });
      this.enemies.push({ sprite, minX: e.minX, maxX: e.maxX, speed: e.speed, dir: 1, alive: true });
    });
  }

  private buildCollectibles(): void {
    L1_HEARTS.forEach((h, i) => {
      const img = this.add.image(h.x, h.y, "heart").setDepth(4);
      this.tweens.add({ targets: img, y: h.y - 3, duration: 700 + (i % 3) * 120, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.hearts.push(img);
    });
    L1_SECRETS.forEach((s) => {
      const img = this.add.image(s.x, s.y, "heart_gold").setDepth(4);
      this.tweens.add({ targets: img, y: s.y - 2, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.tweens.add({ targets: img, alpha: 0.65, duration: 500, yoyo: true, repeat: -1 });
      this.secrets.push({ id: s.id, img, memory: s.memory, got: false });
    });
    L1_CHECKPOINTS.slice(1).forEach((c) => {
      const img = this.add.image(c.x, c.y, "flag_off").setOrigin(0.3, 1).setDepth(2);
      this.flags.push({ img, x: c.x, y: c.y, on: false });
    });
  }

  private buildGoal(): void {
    this.add.image(L1_GOAL.x, L1_GOAL.y, "arch").setOrigin(0.5, 1).setDepth(1);
    this.nihad = this.add.sprite(L1_GOAL.x - 34, L1_GOAL.y - 12, "nihad", "idle0").setFlipX(true).setDepth(3);
    this.nihad.anims.play("nihad-idle");
    this.add.image(L1_GOAL.x - 34, L1_GOAL.y - 36, "heart_mini").setDepth(3);
  }

  // ----------------------------------------------------------------- update

  update(_time: number, delta: number): void {
    if (this.finished) {
      this.clouds.forEach((c, i) => (c.tilePositionX = this.cameras.main.scrollX * (0.1 + i * 0.1)));
      return;
    }
    const now = this.time.now;
    this.elapsed += delta / 1000;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Moving platforms: position is driven directly; riders are carried by the delta.
    this.movers.forEach((m) => {
      const x = m.cfg.cx + Math.sin((now / 1000) * m.cfg.speed) * m.cfg.range;
      const dx = x - m.lastX;
      m.lastX = x;
      m.img.x = x;
      (m.img.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
      if (this.riding === m.img && body.blocked.down === false && body.touching.down) this.player.x += dx;
    });
    this.riding = null;

    const grounded = body.blocked.down || body.touching.down;
    if (grounded) this.lastGrounded = now;

    const stunned = now < this.stunUntil;
    const axis = stunned ? 0 : this.inp.axisX;

    if (axis !== 0) {
      const turning = Math.sign(body.velocity.x) === -axis && Math.abs(body.velocity.x) > 5;
      body.setAccelerationX(axis * RUN_ACCEL * (turning ? 1.8 : 1));
      this.facing = axis;
      body.setDragX(0);
    } else {
      body.setAccelerationX(0);
      body.setDragX(grounded ? GROUND_DRAG : AIR_DRAG);
    }

    if (this.inp.consumePress("jump", BUFFER_MS)) this.jumpQueuedAt = now;
    if (!stunned && this.jumpQueuedAt && now - this.jumpQueuedAt <= BUFFER_MS && now - this.lastGrounded <= COYOTE_MS) {
      body.setVelocityY(JUMP_V);
      this.jumpQueuedAt = 0;
      this.lastGrounded = -9999;
      this.jumpCut = false;
      this.jumpStartAt = now;
      this.sfx("jump");
    }
    // Variable jump height: releasing the button early cuts the jump short.
    if (!this.jumpCut && body.velocity.y < -120 && now - this.jumpStartAt > 110 && !this.inp.isDown("jump")) {
      body.setVelocityY(body.velocity.y * 0.5);
      this.jumpCut = true;
    }
    if (grounded) this.jumpCut = false;

    // Landing feedback
    if (grounded && !this.wasGrounded && this.lastVy > 220) {
      this.sfx("land");
      this.burst(this.player.x, this.player.y + 12, [0xd9ccff, 0xa98bff], 4, 40);
    }
    this.wasGrounded = grounded;
    this.lastVy = body.velocity.y;

    // Animation
    this.player.setFlipX(this.facing < 0);
    let anim = "madina-idle";
    if (stunned) anim = "madina-hurt";
    else if (!grounded) anim = "madina-jump";
    else if (Math.abs(body.velocity.x) > 12 && axis !== 0) anim = "madina-run";
    if (this.player.anims.currentAnim?.key !== anim) this.player.anims.play(anim, true);

    // Falling into a pit
    if (this.player.y > GAME_H + 30) this.fell();

    this.updateEnemies(delta, now);
    this.checkHazards(now);
    this.checkCollectibles();
    this.checkCheckpoints();
    this.checkGoal();

    this.clouds.forEach((c, i) => (c.tilePositionX = this.cameras.main.scrollX * (0.1 + i * 0.1)));
    this.hudTimer += delta;
    if (this.hudTimer > 120) {
      this.hudTimer = 0;
      this.emitHud();
    }
  }

  private playerRect(): Phaser.Geom.Rectangle {
    const b = this.player.body as Phaser.Physics.Arcade.Body;
    return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
  }

  private updateEnemies(delta: number, now: number): void {
    const pr = this.playerRect();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.sprite.x += e.dir * e.speed * (delta / 1000);
      if (e.sprite.x > e.maxX) e.dir = -1;
      if (e.sprite.x < e.minX) e.dir = 1;
      e.sprite.setFlipX(e.dir < 0);
      const er = new Phaser.Geom.Rectangle(e.sprite.x - 8, e.sprite.y - 5, 16, 11);
      if (Phaser.Geom.Intersects.RectangleToRectangle(pr, er)) {
        const stomp = body.velocity.y > 60 && pr.bottom - 6 < er.y + 4;
        if (stomp) {
          e.alive = false;
          this.burst(e.sprite.x, e.sprite.y, [0x6e4aad, 0xd9ccff], 10);
          e.sprite.destroy();
          body.setVelocityY(-250);
          this.sfx("hit");
        } else this.hurt(now, e.sprite.x);
      }
    }
  }

  private checkHazards(now: number): void {
    const pr = this.playerRect();
    for (const s of this.spikes) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(pr, s)) this.hurt(now, s.centerX);
    }
  }

  private checkCollectibles(): void {
    const pr = this.playerRect();
    this.hearts = this.hearts.filter((h) => {
      if (!h.active) return false;
      if (Phaser.Geom.Intersects.RectangleToRectangle(pr, new Phaser.Geom.Rectangle(h.x - 5, h.y - 5, 10, 10))) {
        this.collected++;
        this.sfx("collect");
        this.burst(h.x, h.y, [0xff5c8a, 0xffc2d6], 6, 60);
        this.popup(h.x, h.y - 8, "+100", "#ffc2d6");
        this.tweens.killTweensOf(h);
        h.destroy();
        return false;
      }
      return true;
    });
    for (const s of this.secrets) {
      if (s.got) continue;
      if (Phaser.Geom.Intersects.RectangleToRectangle(pr, new Phaser.Geom.Rectangle(s.img.x - 6, s.img.y - 6, 12, 12))) {
        s.got = true;
        this.foundSecrets.push(s.id);
        this.sfx("secret");
        this.burst(s.img.x, s.img.y, [0xffe94d, 0xfffbd0, 0xffffff], 18, 110);
        this.tweens.killTweensOf(s.img);
        s.img.destroy();
        this.bus.emit("secretHeart", { id: s.id });
        const mem = this.cfg.memories[s.memory % this.cfg.memories.length];
        this.showDialogue({ title: mem.title, text: mem.text });
      }
    }
  }

  private checkCheckpoints(): void {
    for (const f of this.flags) {
      if (f.on) continue;
      if (Math.abs(this.player.x - f.x) < 16 && Math.abs(this.player.y - (f.y - 12)) < 90) {
        f.on = true;
        f.img.setTexture("flag_on");
        this.checkpoint = { x: f.x + 8, y: f.y };
        this.sfx("key");
        this.popup(f.x, f.y - 26, "CHECKPOINT", "#7dffcf");
      }
    }
  }

  private checkGoal(): void {
    if (this.player.x >= L1_GOAL.x - 16) this.finish();
  }

  // --------------------------------------------------------------- damage

  private hurt(now: number, fromX: number): void {
    if (now < this.invUntil || this.finished) return;
    this.hp -= 1;
    this.damageTaken += 1;
    this.sfx("hurt");
    this.shake(0.005, 150);
    this.invUntil = now + INVULN_MS;
    this.stunUntil = now + HITSTUN_MS;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity((this.player.x < fromX ? -1 : 1) * 130, -200);
    this.blink();
    if (this.hp <= 0) this.time.delayedCall(250, () => this.lostAllHealth());
    this.emitHud();
  }

  private blink(): void {
    this.tweens.killTweensOf(this.player);
    this.player.setAlpha(1);
    this.tweens.add({
      targets: this.player,
      alpha: 0.25,
      duration: 90,
      yoyo: true,
      repeat: Math.floor(INVULN_MS / 180),
      onComplete: () => this.player.setAlpha(1),
    });
  }

  private fell(): void {
    const now = this.time.now;
    this.hp -= 1;
    this.damageTaken += 1;
    this.sfx("hurt");
    if (this.hp <= 0) {
      this.lostAllHealth();
      return;
    }
    this.respawn();
    this.invUntil = now + INVULN_MS;
    this.blink();
    this.toast("Careful! Back to the checkpoint.");
    this.emitHud();
  }

  private lostAllHealth(): void {
    if (this.finished) return;
    this.deaths += 1;
    this.hp = 3;
    this.respawn();
    this.invUntil = this.time.now + INVULN_MS;
    this.blink();
    this.toast("Out of hearts! Hearts you collected are kept.");
    this.emitHud();
  }

  private respawn(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    // body.reset moves the body AND clears its previous-position delta; setPosition alone
    // would let a fast fall carry the player into the ground on respawn.
    body.reset(this.checkpoint.x, this.checkpoint.y - 14);
    body.setAcceleration(0, 0);
    this.stunUntil = 0;
    this.cameras.main.fadeIn(250, 20, 10, 46);
  }

  // ----------------------------------------------------------------- finish

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.inp.reset();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
    this.player.anims.play("madina-win");
    this.nihad.anims.play("nihad-win");
    this.sfx("win");
    this.burst(L1_GOAL.x - 20, L1_GOAL.y - 30, [0xff5c8a, 0xffe94d, 0x7dffcf, 0xffc2d6], 40, 130);
    this.banner("LEVEL CLEAR!", "#ffc2d6", 1400);

    const timeSec = Math.round(this.elapsed);
    const score = scoreLevel1({ hearts: this.collected, timeSec, hpLeft: this.hp, deaths: this.deaths });
    const result: LevelResult = {
      level: 1,
      score,
      timeSec,
      collectibles: this.collected,
      perfect: this.damageTaken === 0 && this.deaths === 0 && this.collected >= HEART_TARGET,
      secretHearts: [...this.foundSecrets],
      detail: { hearts: this.collected, hpLeft: this.hp, deaths: this.deaths },
    };
    this.time.delayedCall(1700, () => this.bus.emit("levelComplete", result));
  }

  private emitHud(): void {
    this.hud({
      score: this.collected * 100,
      hp: this.hp,
      maxHp: 3,
      timeSec: this.elapsed,
      chips: [{ label: "Hearts", value: `${this.collected}/${HEART_TARGET}` }],
    });
  }
}

// Silence unused import warnings for constants shared by the scene files.
void GAME_W;
