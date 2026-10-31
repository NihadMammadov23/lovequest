import type { BoyfriendConfig, GirlfriendConfig } from "@/config/gameConfig";
import type { Equipped } from "@/lib/types";
import { canvasOf, dot, rect, shade, type Ctx } from "./draw";

export type Pose = "idle" | "run" | "jump" | "hurt" | "win";

export const CHAR_W = 16;
export const CHAR_H = 24;

/** Frame order inside a character sprite sheet. */
export const CHAR_FRAMES: { name: string; pose: Pose; frame: number }[] = [
  { name: "idle0", pose: "idle", frame: 0 },
  { name: "idle1", pose: "idle", frame: 1 },
  { name: "run0", pose: "run", frame: 0 },
  { name: "run1", pose: "run", frame: 1 },
  { name: "run2", pose: "run", frame: 2 },
  { name: "run3", pose: "run", frame: 3 },
  { name: "jump", pose: "jump", frame: 0 },
  { name: "hurt", pose: "hurt", frame: 0 },
  { name: "win0", pose: "win", frame: 0 },
  { name: "win1", pose: "win", frame: 1 },
];

interface PoseParams {
  bob: number;
  legL: { dx: number; lift: number };
  legR: { dx: number; lift: number };
  armL: { dy: number; up: boolean };
  armR: { dy: number; up: boolean };
  face: "normal" | "happy" | "hurt" | "open";
  capeSwing: number;
}

function poseParams(pose: Pose, frame: number): PoseParams {
  const p: PoseParams = {
    bob: 0,
    legL: { dx: 0, lift: 0 },
    legR: { dx: 0, lift: 0 },
    armL: { dy: 0, up: false },
    armR: { dy: 0, up: false },
    face: "normal",
    capeSwing: 0,
  };
  switch (pose) {
    case "idle":
      p.bob = frame % 2;
      break;
    case "run": {
      const f = frame % 4;
      p.legL = { dx: [-2, 0, 2, 0][f], lift: f === 1 ? 1 : 0 };
      p.legR = { dx: [2, 0, -2, 0][f], lift: f === 3 ? 1 : 0 };
      p.armL = { dy: [1, 0, -1, 0][f], up: false };
      p.armR = { dy: [-1, 0, 1, 0][f], up: false };
      p.bob = f % 2 === 1 ? 1 : 0;
      p.capeSwing = 1;
      break;
    }
    case "jump":
      p.legL = { dx: -1, lift: 2 };
      p.legR = { dx: 1, lift: 1 };
      p.armL = { dy: 0, up: true };
      p.armR = { dy: 0, up: true };
      p.face = "open";
      p.capeSwing = 1;
      break;
    case "hurt":
      p.legL = { dx: -1, lift: 0 };
      p.legR = { dx: 1, lift: 0 };
      p.armL = { dy: -1, up: true };
      p.armR = { dy: 1, up: true };
      p.face = "hurt";
      break;
    case "win":
      p.bob = frame % 2;
      p.armL = { dy: 0, up: true };
      p.armR = { dy: 0, up: true };
      p.legL = { dx: -1, lift: frame % 2 };
      p.legR = { dx: 1, lift: (frame + 1) % 2 };
      p.face = "happy";
      break;
  }
  return p;
}

function legs(g: Ctx, p: PoseParams, pants: string, shoe: string, sole: string, xL = 5, xR = 8): void {
  const draw = (x: number, leg: { dx: number; lift: number }) => {
    const l = leg.lift;
    const lx = Math.max(0, Math.min(CHAR_W - 4, x + leg.dx));
    rect(g, lx, 17, 3, 4 - l, pants);
    rect(g, lx, 21 - l, 3, 2, shoe);
    rect(g, lx, 23 - l, 4, 1, sole);
  };
  draw(xL, p.legL);
  draw(xR, p.legR);
}

function eyes(g: Ctx, p: PoseParams, xL: number, xR: number, y: number, ink: string): void {
  switch (p.face) {
    case "happy":
      dot(g, xL, y + 1, ink);
      dot(g, xL + 1, y, ink);
      dot(g, xR, y, ink);
      dot(g, xR + 1, y + 1, ink);
      break;
    case "hurt":
      dot(g, xL, y, ink);
      dot(g, xL + 1, y + 1, ink);
      dot(g, xL + 1, y, ink);
      dot(g, xL, y + 1, ink);
      dot(g, xR, y, ink);
      dot(g, xR + 1, y + 1, ink);
      dot(g, xR + 1, y, ink);
      dot(g, xR, y + 1, ink);
      break;
    default:
      rect(g, xL, y, 1, 2, ink);
      rect(g, xR, y, 1, 2, ink);
      dot(g, xL, y, "#ffffff");
      dot(g, xR, y, "#ffffff");
      rect(g, xL, y + 1, 1, 1, ink);
      rect(g, xR, y + 1, 1, 1, ink);
  }
}

function arms(g: Ctx, p: PoseParams, top: string, skin: string, xL: number, xR: number, wristband?: string): void {
  const draw = (x: number, a: { dy: number; up: boolean }, right: boolean) => {
    if (a.up) {
      // Arm raised beside the head
      const ax = right ? x + 1 : x - 1;
      rect(g, ax, 6 + a.dy, 2, 3, skin);
      rect(g, ax, 9 + a.dy, 2, 3, top);
      if (wristband && right) rect(g, ax, 8 + a.dy, 2, 1, wristband);
    } else {
      rect(g, x, 12 + a.dy, 2, 2, top);
      rect(g, x, 14 + a.dy, 2, 3, skin);
      if (wristband && right) rect(g, x, 16 + a.dy, 2, 1, wristband);
    }
  };
  draw(xL, p.armL, false);
  draw(xR, p.armR, true);
}

function cape(g: Ctx, kind: string, p: PoseParams): void {
  if (kind === "none") return;
  const main = kind === "royal" ? "#5b2db8" : "#ff4f7d";
  const trim = kind === "royal" ? "#ffd84d" : "#ffb3c8";
  const swing = p.capeSwing;
  rect(g, 3, 11, 10, 2, main);
  rect(g, 1 - swing, 13, 4 + swing, 8, main);
  rect(g, 3, 13, 2, 7, shade(main, -0.15));
  rect(g, 1 - swing, 20, 4 + swing, 1, trim);
  rect(g, 3, 11, 10, 1, trim);
}

export interface GirlSpec {
  look: GirlfriendConfig["look"];
  cosmetics: Equipped;
}

export function drawGirl(g: Ctx, spec: GirlSpec, pose: Pose, frame: number): void {
  const { look, cosmetics: cos } = spec;
  const p = poseParams(pose, frame);
  const b = p.bob;
  const hair = look.hair;
  const hairL = look.hairLight;
  const hairD = shade(hair, -0.35);
  const skin = look.skin;
  const skinD = shade(skin, -0.14);
  const top = look.top;
  const topD = shade(top, -0.16);
  const ink = "#1a0f1f";

  cape(g, cos.cape, p);

  // Hair behind the head: big curly volume
  const rows: [number, number][] = [
    [4, 8],
    [3, 10],
    [2, 12],
    [2, 12],
    [2, 12],
    [2, 12],
    [2, 12],
    [2, 12],
    [2, 12],
  ];
  rows.forEach(([x, w], i) => rect(g, x, i + b, w, 1, hair));
  // Locks falling over the shoulders
  rect(g, 2, 9 + b, 3, 6, hair);
  rect(g, 11, 9 + b, 3, 6, hair);
  rect(g, 2, 14 + b, 2, 1, hairD);
  rect(g, 12, 14 + b, 2, 1, hairD);
  // Curly highlights
  [
    [5, 1],
    [8, 1],
    [10, 2],
    [4, 3],
    [12, 4],
    [3, 6],
    [11, 6],
    [3, 11],
    [12, 12],
    [6, 2],
  ].forEach(([x, y]) => dot(g, x, y + b, hairL));
  [
    [7, 0],
    [9, 3],
    [3, 4],
    [12, 8],
    [2, 10],
  ].forEach(([x, y]) => dot(g, x, y + b, hairD));

  legs(g, p, look.pants, "#ffffff", "#ff8fb8");

  // Torso (white top)
  rect(g, 4, 11, 8, 6, top);
  rect(g, 11, 12, 1, 5, topD);
  rect(g, 4, 16, 8, 1, topD);
  rect(g, 5, 17, 6, 1, look.pants);
  arms(g, p, top, skin, 2, 12);
  rect(g, 7, 10, 2, 1, skinD);

  // Face
  rect(g, 5, 4 + b, 6, 5, skin);
  rect(g, 6, 9 + b, 4, 1, skin);
  rect(g, 5, 8 + b, 1, 1, "#ff9cc4");
  rect(g, 10, 8 + b, 1, 1, "#ff9cc4");
  // Curly fringe
  rect(g, 5, 3 + b, 6, 1, hair);
  dot(g, 5, 4 + b, hair);
  dot(g, 7, 4 + b, hair);
  dot(g, 10, 4 + b, hair);
  dot(g, 8, 3 + b, hairL);
  // Brows + eyes + mouth
  rect(g, 5, 5 + b, 2, 1, hairD);
  rect(g, 9, 5 + b, 2, 1, hairD);
  eyes(g, p, 6, 9, 6 + b, ink);
  if (p.face === "open" || p.face === "hurt") rect(g, 7, 8 + b, 2, 1, "#7a1d3a");
  else if (p.face === "happy") {
    rect(g, 7, 8 + b, 2, 1, "#ff4f7d");
    dot(g, 6, 8 + b, "#ff4f7d");
    dot(g, 9, 8 + b, "#ff4f7d");
  } else rect(g, 7, 8 + b, 2, 1, "#e0567f");

  // Earrings: her signature accessory
  const e = cos.earrings;
  [4, 11].forEach((x) => {
    if (e === "stars") {
      rect(g, x, 9 + b, 1, 3, "#ffe94d");
      dot(g, x + (x < 8 ? -1 : 1), 10 + b, "#ffe94d");
      dot(g, x, 10 + b, "#fffbd0");
    } else if (e === "hearts") {
      rect(g, x - (x < 8 ? 1 : 0), 10 + b, 2, 2, "#ff3d7f");
      dot(g, x - (x < 8 ? 1 : 0), 10 + b, "#ffc2d6");
      dot(g, x, 9 + b, "#ffffff");
    } else {
      rect(g, x, 9 + b, 1, 2, "#ffffff");
      dot(g, x, 11 + b, "#cfd0ff");
    }
  });

  // Eyewear
  if (cos.eyewear === "sunnies") {
    rect(g, 5, 6 + b, 6, 2, "#1a1a2e");
    dot(g, 6, 6 + b, "#9a9aff");
    dot(g, 9, 6 + b, "#9a9aff");
  } else if (cos.eyewear === "heartshades") {
    rect(g, 5, 6 + b, 2, 2, "#ff3d7f");
    rect(g, 9, 6 + b, 2, 2, "#ff3d7f");
    rect(g, 7, 6 + b, 2, 1, "#1a1a2e");
    dot(g, 5, 6 + b, "#ffc2d6");
    dot(g, 9, 6 + b, "#ffc2d6");
  }

  // Hats
  if (cos.hat === "bow") {
    rect(g, 9, 0 + b, 4, 3, "#ff5c8a");
    rect(g, 10, 1 + b, 2, 1, "#c4306a");
    dot(g, 9, 0 + b, "#ffc2d6");
  } else if (cos.hat === "crown") {
    rect(g, 5, 1 + b, 6, 2, "#ffd84d");
    [5, 7, 9].forEach((x) => rect(g, x, 0 + b, 1, 1, "#ffd84d"));
    dot(g, 10, 0 + b, "#ffd84d");
    dot(g, 7, 2 + b, "#ff3d7f");
    dot(g, 9, 2 + b, "#7dffcf");
  }
}

export interface BoySpec {
  look: BoyfriendConfig["look"];
  beard: boolean;
  wristband: boolean;
}

export function drawBoy(g: Ctx, spec: BoySpec, pose: Pose, frame: number): void {
  const { look } = spec;
  const p = poseParams(pose, frame);
  const b = p.bob;
  const hair = look.hair;
  const hairL = look.hairLight;
  const skin = look.skin;
  const skinD = shade(skin, -0.16);
  const top = look.top;
  const topD = shade(top, -0.16);
  const ink = "#140c0a";

  legs(g, p, look.pants, "#e9e6f2", "#3a3a55");

  // Torso
  rect(g, 3, 11, 10, 6, top);
  rect(g, 12, 12, 1, 5, topD);
  rect(g, 3, 16, 10, 1, topD);
  rect(g, 4, 17, 8, 1, look.pants);
  arms(g, p, top, skin, 1, 13, spec.wristband ? "#15121c" : undefined);
  rect(g, 6, 10, 4, 1, skinD);

  // Head
  rect(g, 4, 3 + b, 8, 6, skin);
  rect(g, 3, 5 + b, 1, 2, skinD);
  rect(g, 12, 5 + b, 1, 2, skinD);
  // Short wavy hair
  rect(g, 4, 0 + b, 8, 3, hair);
  rect(g, 3, 1 + b, 1, 4, hair);
  rect(g, 12, 1 + b, 1, 4, hair);
  rect(g, 5, 3 + b, 6, 1, hair);
  [
    [5, 0],
    [8, 0],
    [10, 1],
    [6, 2],
    [11, 2],
  ].forEach(([x, y]) => dot(g, x, y + b, hairL));
  dot(g, 7, 0 + b, shade(hair, 0.0));
  // Thick brows, eyes
  rect(g, 5, 4 + b, 3, 1, hair);
  rect(g, 9, 4 + b, 3, 1, hair);
  eyes(g, p, 6, 9, 5 + b, ink);
  dot(g, 8, 6 + b, skinD);
  // Beard & mustache
  if (spec.beard) {
    const beard = shade(hair, -0.05);
    rect(g, 4, 7 + b, 2, 2, beard);
    rect(g, 10, 7 + b, 2, 2, beard);
    rect(g, 5, 9 + b, 6, 1, beard);
    rect(g, 6, 7 + b, 4, 1, beard);
    dot(g, 6, 8 + b, beard);
    dot(g, 9, 8 + b, beard);
    if (p.face === "open" || p.face === "hurt") rect(g, 7, 8 + b, 2, 1, "#7a1d3a");
    else rect(g, 7, 8 + b, 2, 1, "#b0645a");
  } else {
    rect(g, 7, 8 + b, 2, 1, p.face === "open" || p.face === "hurt" ? "#7a1d3a" : "#b0645a");
  }
}

// ---------------------------------------------------------------------------
// Boss (a big cartoon Nihad) with three moods
// ---------------------------------------------------------------------------

export type BossMood = "sleepy" | "hungry" | "dramatic" | "defeated";
export const BOSS_SIZE = 32;

export function drawBoss(g: Ctx, spec: BoySpec, mood: BossMood): void {
  const { look } = spec;
  const hair = look.hair;
  const hairL = look.hairLight;
  const skin = look.skin;
  const skinD = shade(skin, -0.16);
  const top = look.top;
  const topD = shade(top, -0.16);
  const ink = "#140c0a";
  const beard = shade(hair, -0.05);

  // Body
  rect(g, 6, 21, 20, 11, top);
  rect(g, 24, 22, 2, 10, topD);
  rect(g, 6, 30, 20, 2, topD);
  // Arms
  rect(g, 2, 22, 4, 7, top);
  rect(g, 26, 22, 4, 7, top);
  rect(g, 2, 29, 4, 3, skin);
  rect(g, 26, 29, 4, 3, skin);
  rect(g, 14, 19, 4, 2, skinD);

  // Head
  rect(g, 8, 6, 16, 13, skin);
  rect(g, 7, 11, 1, 4, skinD);
  rect(g, 24, 11, 1, 4, skinD);
  rect(g, 8, 2, 16, 5, hair);
  rect(g, 7, 4, 1, 7, hair);
  rect(g, 24, 4, 1, 7, hair);
  rect(g, 9, 1, 5, 1, hair);
  rect(g, 17, 1, 6, 1, hair);
  [
    [10, 3],
    [14, 2],
    [19, 3],
    [22, 5],
    [9, 5],
  ].forEach(([x, y]) => dot(g, x, y, hairL));

  // Beard + mustache
  rect(g, 8, 14, 3, 5, beard);
  rect(g, 21, 14, 3, 5, beard);
  rect(g, 10, 18, 12, 2, beard);
  rect(g, 12, 15, 8, 2, beard);

  // Brows
  if (mood === "dramatic") {
    rect(g, 10, 10, 3, 1, hair);
    rect(g, 12, 9, 3, 1, hair);
    rect(g, 17, 9, 3, 1, hair);
    rect(g, 19, 10, 3, 1, hair);
  } else if (mood === "hungry") {
    rect(g, 10, 9, 5, 2, hair);
    rect(g, 17, 9, 5, 2, hair);
  } else {
    rect(g, 10, 10, 5, 2, hair);
    rect(g, 17, 10, 5, 2, hair);
  }

  // Eyes + mouth per mood
  if (mood === "sleepy") {
    rect(g, 11, 13, 4, 1, ink);
    rect(g, 18, 13, 4, 1, ink);
    rect(g, 14, 17, 4, 1, "#a05850");
    // nightcap
    rect(g, 8, 1, 16, 4, "#5a6bff");
    rect(g, 22, 3, 6, 3, "#5a6bff");
    rect(g, 27, 6, 3, 3, "#ffffff");
    rect(g, 8, 4, 16, 1, "#ffffff");
    // pillow hug
    rect(g, 7, 23, 18, 7, "#f3ecff");
    rect(g, 7, 29, 18, 1, "#c9b8f5");
    rect(g, 9, 25, 14, 1, "#ffc2d6");
  } else if (mood === "hungry") {
    [11, 18].forEach((x) => {
      rect(g, x, 12, 4, 4, "#ffffff");
      rect(g, x + 1, 13, 2, 3, ink);
      dot(g, x + 1, 13, "#ffffff");
    });
    rect(g, 13, 17, 6, 3, "#7a1d3a");
    rect(g, 15, 19, 3, 1, "#ff8fb8");
    rect(g, 19, 20, 1, 3, "#7dd3ff");
    // burger in hands
    rect(g, 9, 24, 14, 2, "#e0a35a");
    rect(g, 9, 26, 14, 1, "#7bd85a");
    rect(g, 9, 27, 14, 2, "#8a4a2a");
    rect(g, 9, 29, 14, 2, "#e0a35a");
  } else if (mood === "dramatic") {
    [11, 18].forEach((x) => {
      rect(g, x, 12, 4, 4, "#ffffff");
      rect(g, x + 1, 12, 2, 3, ink);
      dot(g, x + 1, 12, "#ffffff");
    });
    rect(g, 14, 18, 5, 1, "#7a1d3a");
    dot(g, 13, 19, "#7a1d3a");
    dot(g, 19, 19, "#7a1d3a");
    // tears
    rect(g, 11, 16, 1, 5, "#7dd3ff");
    rect(g, 20, 16, 1, 5, "#7dd3ff");
    dot(g, 11, 21, "#bfe9ff");
    dot(g, 20, 21, "#bfe9ff");
    // hand on forehead
    rect(g, 24, 14, 3, 10, top);
    rect(g, 22, 6, 5, 4, skin);
    rect(g, 24, 8, 3, 8, top);
  } else {
    // defeated: X eyes, tongue out, little flag
    [11, 18].forEach((x) => {
      dot(g, x, 12, ink);
      dot(g, x + 1, 13, ink);
      dot(g, x + 2, 14, ink);
      dot(g, x + 3, 15, ink);
      dot(g, x + 3, 12, ink);
      dot(g, x + 2, 13, ink);
      dot(g, x + 1, 14, ink);
      dot(g, x, 15, ink);
    });
    rect(g, 14, 17, 5, 2, "#7a1d3a");
    rect(g, 15, 19, 3, 2, "#ff8fb8");
    rect(g, 28, 14, 1, 16, "#c9c9d8");
    rect(g, 22, 14, 6, 5, "#ffffff");
  }
}

// ---------------------------------------------------------------------------
// Sprite sheets (canvas with all frames side by side)
// ---------------------------------------------------------------------------

export function girlSheet(spec: GirlSpec): HTMLCanvasElement {
  return canvasOf(CHAR_W * CHAR_FRAMES.length, CHAR_H, (g) => {
    CHAR_FRAMES.forEach((f, i) => {
      g.save();
      g.translate(i * CHAR_W, 0);
      g.beginPath();
      g.rect(0, 0, CHAR_W, CHAR_H);
      g.clip();
      drawGirl(g, spec, f.pose, f.frame);
      g.restore();
    });
  });
}

export function boySheet(spec: BoySpec): HTMLCanvasElement {
  return canvasOf(CHAR_W * CHAR_FRAMES.length, CHAR_H, (g) => {
    CHAR_FRAMES.forEach((f, i) => {
      g.save();
      g.translate(i * CHAR_W, 0);
      g.beginPath();
      g.rect(0, 0, CHAR_W, CHAR_H);
      g.clip();
      drawBoy(g, spec, f.pose, f.frame);
      g.restore();
    });
  });
}

export function bossCanvas(spec: BoySpec, mood: BossMood): HTMLCanvasElement {
  return canvasOf(BOSS_SIZE, BOSS_SIZE, (g) => drawBoss(g, spec, mood));
}
