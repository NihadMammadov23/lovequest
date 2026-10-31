import { SNACK_BAD_PENALTY, snackCatchPoints } from "@/lib/scoring";
import { GAME_W } from "../constants";
import { CatcherScene, type FallingItem } from "./CatcherScene";

const GOOD = ["icecream", "icecream", "donut", "cookie", "cupcake"];
const BAD = ["broccoli", "sock"];

export class SnackScene extends CatcherScene {
  constructor() {
    super("Snack");
  }
  protected gameId = "snack" as const;
  protected duration = 45;
  protected bannerText = "SNACK ATTACK";
  protected hint = "CATCH THE SNACKS - DODGE THE BROCCOLI AND SOCKS!";
  private lives_ = 3;
  private spawnIn = 0.6;

  create(): void {
    this.lives_ = 3;
    this.spawnIn = 0.6;
    super.create();
  }

  protected lives() {
    return { hp: this.lives_, maxHp: 3 };
  }

  protected extraChips() {
    return [{ label: "Snacks", value: String(this.caught) }];
  }

  protected spawn(dt: number): void {
    this.spawnIn -= dt;
    if (this.spawnIn > 0) return;
    const p = Math.min(1, this.elapsed / this.duration);
    this.spawnIn = 0.85 - 0.4 * p + Math.random() * 0.15;
    const speed = 70 + 105 * p + Math.random() * 20;
    const bad = Math.random() < 0.28 + 0.1 * p;
    const kind = bad ? BAD[Math.floor(Math.random() * BAD.length)] : GOOD[Math.floor(Math.random() * GOOD.length)];
    const x = 20 + Math.random() * (GAME_W - 40);
    this.addItem(kind, x, speed, !bad, { scale: 1.4 });
  }

  protected onCatch(it: FallingItem): void {
    const { x, y } = it.img;
    if (it.good) {
      const pts = snackCatchPoints(this.combo);
      this.caught += 1;
      this.addScore(pts, x, y - 6);
      this.bump();
      this.sfx("collect");
      this.burst(x, y, [0xff8fb8, 0xffe94d, 0x7dffcf], 7, 60);
    } else {
      this.lives_ -= 1;
      this.combo = 0;
      this.addScore(-SNACK_BAD_PENALTY, x, y - 6, "#ff8a7a");
      this.sfx("hurt");
      this.shake(0.004, 120);
      this.burst(x, y, [0x6e4aad, 0xff6b6b], 8, 70);
      this.player.setTint(0xff9999);
      this.time.delayedCall(180, () => this.player.clearTint());
      if (this.lives_ <= 0) this.end("OUT OF LIVES!");
    }
  }

  protected onMiss(it: FallingItem): void {
    if (it.good) this.combo = 0;
  }
}
