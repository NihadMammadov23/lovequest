/** Level 1 layout. All numbers are in game pixels (the screen is 480x270). */

export interface Rect3 {
  x: number;
  y: number;
  w: number;
}

export const L1_WORLD_W = 2560;

/** Solid ground blocks: x, top y, width. Height is derived to reach the bottom of the screen. */
export const L1_GROUND: Rect3[] = [
  { x: 0, y: 224, w: 520 },
  { x: 584, y: 224, w: 296 },
  { x: 880, y: 224, w: 120 },
  { x: 1064, y: 224, w: 80 },
  { x: 1208, y: 208, w: 92 },
  { x: 1420, y: 208, w: 140 },
  { x: 1624, y: 224, w: 256 },
  { x: 1880, y: 192, w: 64 },
  { x: 1944, y: 160, w: 64 },
  { x: 2008, y: 128, w: 72 },
  { x: 2260, y: 224, w: 300 },
];

/** One-way floating cloud platforms: x, top y, width. */
export const L1_CLOUDS: Rect3[] = [
  { x: 150, y: 186, w: 64 },
  { x: 260, y: 150, w: 64 },
  { x: 370, y: 186, w: 64 },
  { x: 536, y: 196, w: 32 },
  { x: 1016, y: 200, w: 32 },
  { x: 1090, y: 168, w: 48 },
  { x: 1230, y: 170, w: 48 },
  { x: 2100, y: 150, w: 48 },
  { x: 2190, y: 120, w: 48 },
  { x: 2150, y: 238, w: 36 },
  { x: 2210, y: 230, w: 28 },
];

export interface MovingPlatform {
  cx: number;
  y: number;
  w: number;
  range: number;
  /** radians per second */
  speed: number;
}

export const L1_MOVING: MovingPlatform[] = [{ cx: 1360, y: 196, w: 40, range: 36, speed: 1.3 }];

export const L1_HEARTS: { x: number; y: number }[] = [
  { x: 70, y: 208 },
  { x: 110, y: 208 },
  { x: 182, y: 170 },
  { x: 292, y: 134 },
  { x: 402, y: 170 },
  { x: 552, y: 180 },
  { x: 930, y: 208 },
  { x: 1032, y: 184 },
  { x: 1114, y: 152 },
  { x: 1254, y: 154 },
  { x: 1360, y: 176 },
  { x: 1490, y: 190 },
  { x: 1976, y: 144 },
  { x: 2112, y: 134 },
  { x: 2214, y: 104 },
];

export const L1_SECRETS: { id: "l1a" | "l1b"; x: number; y: number; memory: number }[] = [
  { id: "l1a", x: 292, y: 92, memory: 0 },
  { id: "l1b", x: 2168, y: 226, memory: 1 },
];

/** Spike strips: x, ground top y, count of 16px spike pairs. */
export const L1_SPIKES: { x: number; y: number; n: number }[] = [
  { x: 420, y: 224, n: 2 },
  { x: 1480, y: 208, n: 2 },
  { x: 1830, y: 224, n: 2 },
  { x: 2400, y: 224, n: 2 },
];

export const L1_ENEMIES: { x: number; y: number; minX: number; maxX: number; speed: number }[] = [
  { x: 1770, y: 224, minX: 1720, maxX: 1815, speed: 38 },
  { x: 2330, y: 224, minX: 2290, maxX: 2380, speed: 32 },
];

export const L1_CHECKPOINTS: { x: number; y: number }[] = [
  { x: 40, y: 224 },
  { x: 620, y: 224 },
  { x: 1640, y: 224 },
];

export const L1_GOAL = { x: 2510, y: 224 };
