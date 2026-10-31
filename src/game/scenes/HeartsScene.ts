import { heartCatchPoints } from "@/lib/scoring";
import { GAME_W } from "../constants";
import { CatcherScene, type FallingItem } from "./CatcherScene";

export class HeartsScene extends CatcherScene {
  constructor() {
    super("Hearts");
  }
  protected gameId = "hearts" as const;
  protected duration = 40;
  protected bannerText = "HEART CATCHER";
  protected hint = "CATCH THE HEARTS! GOLD ONES ARE WORTH MORE. MISSES BREAK YOUR COMBO.";
  private spawnIn = 0.5;
  private bonusCount = 0;
  private secretAt = 0;
  private secretSpawned = false;

  create(): void {
    this.spawnIn = 0.5;
    this.bonusCount = 0;
    this.secretSpawned = false;
    this.secretAt = 14 + Math.random() * 14;
    super.create();
  }

  protected extraChips() {
    return [{ label: "Hearts", value: String(this.caught) }];
  }

  protected spawn(dt: number): void {
    if (!this.secretSpawned && this.elapsed >= this.secretAt) {
      this.secretSpawned = true;
      this.addItem("heart_mint", 40 + Math.random() * (GAME_W - 80), 75, true, { scale: 2, secret: true });
      this.toast("A secret heart is falling!");
    }
    this.spawnIn -= dt;
    if (this.spawnIn > 0) return;
    const p = Math.min(1, this.elapsed / this.duration);
    this.spawnIn = 0.62 - 0.27 * p + Math.random() * 0.1;
    const bonus = Math.random() < 0.12;
    const speed = (85 + 70 * p + Math.random() * 20) * (bonus ? 1.35 : 1);
    const x = 18 + Math.random() * (GAME_W - 36);
    this.addItem(bonus ? "heart_gold" : "heart", x, speed, true, { scale: bonus ? 2 : 1.6, vx: bonus ? (Math.random() < 0.5 ? -26 : 26) : 0 });
    // Occasionally drop a pair so the combo can build
    if (!bonus && Math.random() < 0.3) this.addItem("heart", Math.min(GAME_W - 18, Math.max(18, x + (Math.random() < 0.5 ? -34 : 34))), speed * 0.95, true, { scale: 1.6 });
  }

  protected onCatch(it: FallingItem): void {
    const { x, y } = it.img;
    if (it.secret) {
      this.secrets.push("l3");
      this.score += 100;
      this.popup(x, y - 6, "SECRET +100", "#7dffcf");
      this.sfx("secret");
      this.burst(x, y, [0x7dffcf, 0xffffff, 0xffe94d], 18, 110);
      this.bus.emit("secretHeart", { id: "l3" });
      return;
    }
    const bonus = it.kind === "heart_gold";
    if (bonus) this.bonusCount += 1;
    this.caught += 1;
    this.addScore(heartCatchPoints(this.combo, bonus), x, y - 6, bonus ? "#ffe94d" : "#ffc2d6");
    this.bump();
    this.sfx(bonus ? "achievement" : "collect");
    this.burst(x, y, bonus ? [0xffe94d, 0xfffbd0] : [0xff5c8a, 0xffc2d6], bonus ? 10 : 6, 60);
  }

  protected onMiss(it: FallingItem): void {
    if (!it.secret) this.combo = 0;
  }
}
