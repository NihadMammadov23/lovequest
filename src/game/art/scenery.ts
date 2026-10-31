import { makeRng } from "@/lib/text";
import { canvasOf, dot, mix, rect } from "./draw";
import { disc } from "./sprites";

export interface CloudLayerOptions {
  baseY: number;
  body: string;
  edge: string;
  seed: number;
  amp: [number, number];
  arc: [number, number];
}

/** Scalloped cloud bank in the style of the night-sky reference. Tiles seamlessly horizontally. */
export function cloudLayerCanvas(w: number, h: number, o: CloudLayerOptions): HTMLCanvasElement {
  return canvasOf(w, h, (g) => {
    const rng = makeRng(o.seed);
    const arcs: { x0: number; w: number; hgt: number }[] = [];
    let x = 0;
    while (x < w) {
      let aw = Math.round(o.arc[0] + rng() * (o.arc[1] - o.arc[0]));
      if (w - x - aw < o.arc[0]) aw = w - x;
      arcs.push({ x0: x, w: aw, hgt: Math.round(o.amp[0] + rng() * (o.amp[1] - o.amp[0])) });
      x += aw;
    }
    const top: number[] = new Array(w).fill(o.baseY);
    for (const a of arcs) {
      for (let i = 0; i < a.w; i++) {
        const u = ((i + 0.5) / a.w) * 2 - 1;
        top[a.x0 + i] = o.baseY - Math.round(Math.pow(Math.max(0, 1 - u * u), 0.7) * a.hgt);
      }
    }
    const soft = mix(o.body, o.edge, 0.45);
    for (let xx = 0; xx < w; xx++) {
      const t = top[xx];
      rect(g, xx, t, 1, h - t, o.body);
      rect(g, xx, t, 1, 2, o.edge);
      if (xx % 2 === 0) dot(g, xx, t + 2, o.edge);
      if (xx % 2 === 1) dot(g, xx, t + 3, soft);
      if (xx % 4 === 0) dot(g, xx, t + 4, soft);
      const next = top[(xx + 1) % w];
      if (Math.abs(next - t) > 1) rect(g, xx, Math.min(t, next), 1, Math.abs(next - t), o.edge);
    }
  });
}

export const CLOUD_PRESETS: CloudLayerOptions[] = [
  { baseY: 140, body: "#3b1480", edge: "#7a52e0", seed: 11, amp: [16, 28], arc: [44, 76] },
  { baseY: 176, body: "#4f1a9c", edge: "#9068ee", seed: 23, amp: [14, 26], arc: [36, 64] },
  { baseY: 210, body: "#6226b8", edge: "#a07bff", seed: 37, amp: [12, 22], arc: [32, 56] },
  { baseY: 240, body: "#7440d0", edge: "#b79bff", seed: 41, amp: [10, 18], arc: [28, 48] },
];

export interface SkyOptions {
  seed?: number;
  moon?: boolean;
  shootingStar?: boolean;
  starCount?: number;
  /** Moon centre as a fraction of the canvas (defaults 0.64, 0.24). */
  moonX?: number;
  moonY?: number;
}

const SKY_BANDS = ["#12072b", "#1a0a3d", "#240d52", "#2d1066", "#361278", "#40168a"];

/** Night sky with dithered colour bands, yellow stars and an optional pixel crescent moon. */
export function skyCanvas(w: number, h: number, o: SkyOptions = {}): HTMLCanvasElement {
  const rng = makeRng(o.seed ?? 5);
  return canvasOf(w, h, (g) => {
    const bandH = Math.ceil(h / SKY_BANDS.length);
    SKY_BANDS.forEach((c, i) => rect(g, 0, i * bandH, w, bandH + 1, c));
    // Checker dither where bands meet
    for (let i = 1; i < SKY_BANDS.length; i++) {
      const y = i * bandH;
      for (let x = 0; x < w; x++) {
        dot(g, x, y - 1 + (x % 2), SKY_BANDS[i]);
        if (x % 4 === 0) dot(g, x, y - 2, SKY_BANDS[i]);
      }
    }
    const count = o.starCount ?? Math.round((w * h) / 2400);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rng() * (w - 4)) + 2;
      const y = Math.floor(rng() * h * 0.62) + 2;
      if (i % 5 === 0) {
        rect(g, x, y - 1, 1, 3, "#ffe94d");
        rect(g, x - 1, y, 3, 1, "#ffe94d");
      } else dot(g, x, y, i % 3 === 0 ? "#fff6a8" : "#ffe94d");
    }
    if (o.moon !== false) {
      const cx = Math.round(w * (o.moonX ?? 0.64));
      const cy = Math.round(h * (o.moonY ?? 0.24));
      const r = Math.max(8, Math.round(h * 0.06));
      for (let y = cy - r - 1; y <= cy + r + 1; y++) {
        for (let x = cx - r - 1; x <= cx + r + 1; x++) {
          const inA = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r;
          const inB = Math.hypot(x + 0.5 - (cx + r * 0.45), y + 0.5 - (cy - r * 0.3)) <= r * 0.92;
          if (inA && !inB) dot(g, x, y, "#ffe94d");
        }
      }
    }
    if (o.shootingStar) {
      for (let i = 0; i < 9; i++) dot(g, 28 + i * 3, 36 + i * 3, i > 6 ? "#ffe94d" : "#d8b92e");
      rect(g, 55, 63, 4, 3, "#ffe94d");
    }
  });
}

// ---------------------------------------------------------------------------
// Ground, platforms and maze tiles
// ---------------------------------------------------------------------------

const STONE = "#3a1478";
const STONE_D = "#2c0f5e";
const STONE_L = "#4a1d96";

/** Solid ground block with a mossy moonlit top. */
export function groundBlockCanvas(w: number, h: number, seed = 3): HTMLCanvasElement {
  const rng = makeRng(seed + w * 7 + h);
  return canvasOf(w, h, (g) => {
    rect(g, 0, 0, w, h, STONE);
    for (let y = 8; y < h; y += 8) {
      rect(g, 0, y, w, 1, STONE_D);
      const off = (y / 8) % 2 === 0 ? 0 : 8;
      for (let x = off; x < w; x += 16) rect(g, x, y, 1, 8, STONE_D);
    }
    for (let i = 0; i < Math.max(2, Math.round((w * h) / 90)); i++) {
      dot(g, Math.floor(rng() * w), 5 + Math.floor(rng() * Math.max(1, h - 5)), STONE_L);
    }
    rect(g, 0, 0, w, 1, "#e6dcff");
    rect(g, 0, 1, w, 2, "#b79bff");
    rect(g, 0, 3, w, 2, "#7f55d8");
    for (let x = 0; x < w; x += 2) dot(g, x, 5, "#7f55d8");
    for (let x = 0; x < w; x += 7) {
      dot(g, x + 2, 0, "#7dffcf");
      dot(g, x + 3, 1, "#7dffcf");
    }
    rect(g, 0, 0, 1, h, "#5a2db8");
    rect(g, w - 1, 0, 1, h, STONE_D);
  });
}

/** Fluffy one-way cloud platform. */
export function cloudPlatformCanvas(w: number): HTMLCanvasElement {
  return canvasOf(w, 12, (g) => {
    rect(g, 1, 5, w - 2, 5, "#e9dfff");
    rect(g, 0, 6, w, 3, "#e9dfff");
    for (let x = 4; x < w - 2; x += 9) disc(g, x + 2, 5, 4.4, "#f6f0ff");
    rect(g, 1, 9, w - 2, 2, "#b9a5f5");
    rect(g, 3, 11, w - 6, 1, "#8f78d8");
    for (let x = 3; x < w - 3; x += 6) dot(g, x, 8, "#cdbcff");
  });
}

export function mazeFloorTile(): HTMLCanvasElement {
  return canvasOf(16, 16, (g) => {
    rect(g, 0, 0, 16, 16, "#22104a");
    rect(g, 0, 0, 8, 8, "#291457");
    rect(g, 8, 8, 8, 8, "#291457");
    dot(g, 3, 4, "#3a1d78");
    dot(g, 12, 11, "#3a1d78");
  });
}

export function mazeWallTile(): HTMLCanvasElement {
  return canvasOf(16, 16, (g) => {
    rect(g, 0, 0, 16, 16, "#6a3cc9");
    rect(g, 0, 0, 16, 2, "#c4adff");
    rect(g, 0, 2, 16, 2, "#9068ee");
    rect(g, 0, 13, 16, 3, "#3a1a80");
    rect(g, 0, 8, 16, 1, "#5a2db8");
    rect(g, 7, 0, 1, 8, "#5a2db8");
    rect(g, 3, 9, 1, 4, "#5a2db8");
    rect(g, 11, 9, 1, 4, "#5a2db8");
    dot(g, 2, 5, "#7dffcf");
    dot(g, 12, 6, "#ff8fb8");
  });
}

/** Small decorative bush / star-flower sprites to dress up levels. */
export function tuftCanvas(): HTMLCanvasElement {
  return canvasOf(10, 6, (g) => {
    rect(g, 1, 3, 1, 3, "#7dffcf");
    rect(g, 4, 1, 1, 5, "#7dffcf");
    rect(g, 7, 2, 1, 4, "#7dffcf");
    dot(g, 4, 0, "#ff8fb8");
    dot(g, 1, 2, "#ffe94d");
    dot(g, 7, 1, "#ffe94d");
  });
}
