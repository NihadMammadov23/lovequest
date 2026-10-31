import type Phaser from "phaser";
import type { GameConfig } from "@/config/gameConfig";
import type { Equipped } from "@/lib/types";
import { CHAR_FRAMES, CHAR_H, CHAR_W, BOSS_SIZE, boySheet, bossCanvas, girlSheet, type BossMood } from "./characters";
import {
  CLOUD_PRESETS,
  cloudLayerCanvas,
  cloudPlatformCanvas,
  groundBlockCanvas,
  mazeFloorTile,
  mazeWallTile,
  skyCanvas,
  tuftCanvas,
} from "./scenery";
import * as S from "./sprites";

export interface ArtContext {
  config: GameConfig;
  equipped: Equipped;
}

function addCanvas(tm: Phaser.Textures.TextureManager, key: string, canvas: HTMLCanvasElement): void {
  if (tm.exists(key)) tm.remove(key);
  tm.addCanvas(key, canvas);
}

function addSheet(tm: Phaser.Textures.TextureManager, key: string, canvas: HTMLCanvasElement): void {
  if (tm.exists(key)) tm.remove(key);
  const tex = tm.addCanvas(key, canvas);
  if (!tex) return;
  CHAR_FRAMES.forEach((f, i) => tex.add(f.name, 0, i * CHAR_W, 0, CHAR_W, CHAR_H));
}

/** Creates every texture used by the game. Safe to call again (textures are replaced). */
export function registerTextures(tm: Phaser.Textures.TextureManager, ctx: ArtContext): void {
  const { config, equipped } = ctx;

  addCanvas(tm, "sky", skyCanvas(480, 270, { seed: 5 }));
  CLOUD_PRESETS.forEach((p, i) => addCanvas(tm, `clouds${i}`, cloudLayerCanvas(480, 270, p)));

  addSheet(tm, "madina", girlSheet({ look: config.girlfriend.look, cosmetics: equipped }));
  const boySpec = { look: config.boyfriend.look, beard: config.boyfriend.beard, wristband: config.boyfriend.wristband };
  addSheet(tm, "nihad", boySheet(boySpec));
  (["sleepy", "hungry", "dramatic", "defeated"] as BossMood[]).forEach((m) => addCanvas(tm, `boss_${m}`, bossCanvas(boySpec, m)));

  const sprites: Record<string, HTMLCanvasElement> = {
    heart: S.heartCanvas("pink"),
    heart_gold: S.heartCanvas("gold"),
    heart_mint: S.heartCanvas("mint"),
    sparkle: S.sparkleCanvas(),
    icecream: S.iceCreamCanvas(),
    donut: S.donutCanvas(),
    cookie: S.cookieCanvas(),
    cupcake: S.cupcakeCanvas(),
    pizza: S.pizzaCanvas(12),
    pizza_big: S.pizzaCanvas(16),
    burger: S.burgerCanvas(),
    drumstick: S.drumstickCanvas(),
    broccoli: S.broccoliCanvas(),
    sock: S.sockCanvas(),
    pillow: S.pillowCanvas(),
    key: S.keyCanvas(),
    spike: S.spikeCanvas(),
    cloud_enemy: S.cloudEnemyCanvas(),
    flag_off: S.flagCanvas(false),
    flag_on: S.flagCanvas(true),
    arch: S.archCanvas(),
    door: S.lockedDoorCanvas(),
    station_quiz: S.stationCanvas("quiz"),
    station_cards: S.stationCanvas("cards"),
    heart_mini: S.heartMiniCanvas(),
    wave: S.waveCanvas(),
    warn: S.warnCanvas(),
    px: S.pixelCanvas("#ffffff", 2),
    tuft: tuftCanvas(),
    maze_floor: mazeFloorTile(),
    maze_wall: mazeWallTile(),
  };
  Object.entries(sprites).forEach(([k, c]) => addCanvas(tm, k, c));
  if (!tm.exists("ground_480")) addCanvas(tm, "ground_480", groundBlockCanvas(480, 44));
  [64, 48, 40, 32].forEach((w) => ensureCloud(tm, w));
}

/** Registers the shared animations once per Phaser game instance. */
export function registerAnimations(anims: Phaser.Animations.AnimationManager): void {
  for (const who of ["madina", "nihad"]) {
    const def = (suffix: string, frames: string[], frameRate: number, repeat: number) => {
      const key = `${who}-${suffix}`;
      if (anims.exists(key)) anims.remove(key);
      anims.create({ key, frames: frames.map((f) => ({ key: who, frame: f })), frameRate, repeat });
    };
    def("idle", ["idle0", "idle1"], 2.5, -1);
    def("run", ["run0", "run1", "run2", "run3"], 10, -1);
    def("jump", ["jump"], 1, -1);
    def("hurt", ["hurt"], 1, -1);
    def("win", ["win0", "win1"], 4, -1);
  }
}

const groundKeyCache = new Set<string>();

/** Platform textures are created on demand and cached by size. */
export function ensureGround(tm: Phaser.Textures.TextureManager, w: number, h: number): string {
  const key = `ground_${w}x${h}`;
  if (!tm.exists(key)) {
    addCanvas(tm, key, groundBlockCanvas(w, h));
    groundKeyCache.add(key);
  }
  return key;
}

export function ensureCloud(tm: Phaser.Textures.TextureManager, w: number): string {
  const key = `cloudp_${w}`;
  if (!tm.exists(key)) addCanvas(tm, key, cloudPlatformCanvas(w));
  return key;
}

export { BOSS_SIZE };
