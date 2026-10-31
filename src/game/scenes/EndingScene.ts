import * as Phaser from "phaser";
import { GAME_H, GAME_W } from "../constants";
import { BaseScene } from "./BaseScene";

/** The celebratory finale: both characters beneath a starry sky. Purely visual; the React overlay owns the text. */
export class EndingScene extends BaseScene {
  constructor() {
    super("Ending");
  }

  private layers: Phaser.GameObjects.TileSprite[] = [];
  private nextFirework = 0;
  private secret = false;

  create(data: { secret?: boolean }): void {
    this.secret = !!data?.secret;
    this.layers = this.addBackdrop(4, [0.9, 0.85, 0.8, 0.75]);

    // A soft hill of cloud for the couple to stand on
    const hill = this.add.rectangle(GAME_W / 2, GAME_H - 16, GAME_W, 32, 0x7440d0).setDepth(2);
    this.add.rectangle(GAME_W / 2, GAME_H - 32, GAME_W, 3, 0xb79bff).setDepth(2);
    hill.setAlpha(1);

    const madina = this.add.sprite(GAME_W / 2 - 26, GAME_H - 46, "madina", "win0").setScale(2).setDepth(5);
    const nihad = this.add.sprite(GAME_W / 2 + 26, GAME_H - 46, "nihad", "win0").setScale(2).setFlipX(true).setDepth(5);
    madina.anims.play("madina-win");
    nihad.anims.play("nihad-win");
    this.tweens.add({ targets: [madina, nihad], y: GAME_H - 50, duration: 450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Big floating heart between them
    const heart = this.add.image(GAME_W / 2, GAME_H - 92, this.secret ? "heart_gold" : "heart").setScale(3).setDepth(6);
    this.tweens.add({ targets: heart, scale: 3.4, y: heart.y - 5, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Twinkling sparkles
    for (let i = 0; i < 14; i++) {
      const s = this.add.image(Phaser.Math.Between(10, GAME_W - 10), Phaser.Math.Between(8, 130), "sparkle").setDepth(1).setAlpha(0.2);
      this.tweens.add({ targets: s, alpha: 1, duration: Phaser.Math.Between(500, 1400), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 1200) });
    }
    // Slow rising hearts
    this.add.particles(0, GAME_H, "heart", {
      x: { min: 0, max: GAME_W },
      speedY: { min: -26, max: -50 },
      speedX: { min: -8, max: 8 },
      lifespan: 5200,
      frequency: 650,
      alpha: { start: 0.9, end: 0 },
      scale: { start: 0.8, end: 1.2 },
    }).setDepth(3);

    this.cameras.main.fadeIn(900, 20, 10, 46);
    this.bindCommon();
    this.sfx("win");
  }

  update(time: number, delta: number): void {
    this.layers.forEach((l, i) => (l.tilePositionX += (delta / 1000) * (3 + i * 3)));
    if (time > this.nextFirework) {
      this.nextFirework = time + 900 + Math.random() * 900;
      const x = Phaser.Math.Between(50, GAME_W - 50);
      const y = Phaser.Math.Between(25, 110);
      const palette = this.secret ? [0xffe94d, 0xfffbd0, 0xffffff] : [0xff5c8a, 0xffe94d, 0x7dffcf, 0xffc2d6, 0xa98bff];
      this.burst(x, y, palette, 22, 90);
    }
  }
}
