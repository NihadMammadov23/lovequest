import { makeRng } from "@/lib/text";

export interface Pt {
  x: number;
  y: number;
}

export interface MazeStation extends Pt {
  kind: "quiz" | "cards";
  /** 1..3, also the key this station awards and the door it opens. */
  n: 1 | 2 | 3;
}

export interface MazeDoor extends Pt {
  n: 1 | 2 | 3;
}

export interface MazeLayout {
  /** Size in tiles (always odd). */
  w: number;
  h: number;
  solid: boolean[][]; // [y][x]
  start: Pt;
  exit: Pt;
  /** Shortest route from start to exit, tile by tile. */
  path: Pt[];
  stations: MazeStation[];
  doors: MazeDoor[];
  bonus: Pt[];
  secret: Pt;
}

export const MAZE_CELLS_X = 14;
export const MAZE_CELLS_Y = 7;
export const MAZE_SEED = 20260711;

const DIRS: Pt[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

const key = (p: Pt): string => `${p.x},${p.y}`;

function openNeighbours(solid: boolean[][], p: Pt): Pt[] {
  return DIRS.map((d) => ({ x: p.x + d.x, y: p.y + d.y })).filter(
    (n) => n.y >= 0 && n.y < solid.length && n.x >= 0 && n.x < solid[0].length && !solid[n.y][n.x],
  );
}

/** Breadth-first search. `blocked` tiles are treated as walls. Returns distance map and parent map. */
export function bfs(solid: boolean[][], from: Pt, blocked: Set<string> = new Set()) {
  const dist = new Map<string, number>([[key(from), 0]]);
  const parent = new Map<string, Pt | null>([[key(from), null]]);
  const queue: Pt[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    for (const n of openNeighbours(solid, cur)) {
      const k = key(n);
      if (dist.has(k) || blocked.has(k)) continue;
      dist.set(k, (dist.get(key(cur)) ?? 0) + 1);
      parent.set(k, cur);
      queue.push(n);
    }
  }
  return { dist, parent };
}

/** Builds the deterministic memory maze (a perfect maze, so every door really blocks the only route). */
export function buildMaze(seed: number = MAZE_SEED, cellsX = MAZE_CELLS_X, cellsY = MAZE_CELLS_Y): MazeLayout {
  const w = cellsX * 2 + 1;
  const h = cellsY * 2 + 1;
  const solid: boolean[][] = Array.from({ length: h }, () => Array.from({ length: w }, () => true));
  const rng = makeRng(seed);

  // Recursive backtracker over cells (odd, odd).
  const visited = new Set<string>();
  const stack: Pt[] = [{ x: 1, y: 1 }];
  solid[1][1] = false;
  visited.add("1,1");
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const options = DIRS.map((d) => ({ x: cur.x + d.x * 2, y: cur.y + d.y * 2, d })).filter(
      (n) => n.x > 0 && n.y > 0 && n.x < w - 1 && n.y < h - 1 && !visited.has(key(n)),
    );
    if (!options.length) {
      stack.pop();
      continue;
    }
    const next = options[Math.floor(rng() * options.length)];
    solid[cur.y + next.d.y][cur.x + next.d.x] = false;
    solid[next.y][next.x] = false;
    visited.add(key(next));
    stack.push({ x: next.x, y: next.y });
  }

  const start: Pt = { x: 1, y: 1 };
  const exit: Pt = { x: w - 2, y: h - 2 };

  const { parent } = bfs(solid, start);
  const path: Pt[] = [];
  for (let p: Pt | null = exit; p; p = parent.get(key(p)) ?? null) path.unshift(p);

  // A door must sit in a gap between two cells (exactly one even coordinate) so it looks like a doorway.
  const isGap = (p: Pt) => (p.x % 2 === 0) !== (p.y % 2 === 0);
  const pickGap = (target: number, min: number): number => {
    for (let off = 0; off < path.length; off++) {
      for (const i of [target + off, target - off]) {
        if (i > min && i < path.length - 2 && isGap(path[i])) return i;
      }
    }
    return Math.max(min + 1, Math.min(path.length - 3, target));
  };

  const doorIdx: number[] = [];
  let last = 6;
  [0.34, 0.6, 0.82].forEach((frac) => {
    const idx = pickGap(Math.round(path.length * frac), last + 4);
    doorIdx.push(idx);
    last = idx;
  });

  const doors: MazeDoor[] = doorIdx.map((i, k) => ({ ...path[i], n: (k + 1) as 1 | 2 | 3 }));
  const kinds: MazeStation["kind"][] = ["quiz", "cards", "quiz"];
  const stations: MazeStation[] = doorIdx.map((i, k) => ({ ...path[Math.max(2, i - 3)], kind: kinds[k], n: (k + 1) as 1 | 2 | 3 }));

  // Dead ends (one open neighbour) that are off the main route hold the optional collectibles.
  const onPath = new Set(path.map(key));
  const fromPath = new Map<string, number>();
  {
    const queue: Pt[] = path.slice();
    path.forEach((p) => fromPath.set(key(p), 0));
    for (let i = 0; i < queue.length; i++) {
      const cur = queue[i];
      for (const n of openNeighbours(solid, cur)) {
        if (fromPath.has(key(n))) continue;
        fromPath.set(key(n), (fromPath.get(key(cur)) ?? 0) + 1);
        queue.push(n);
      }
    }
  }
  const deadEnds: Pt[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = { x, y };
      if (solid[y][x] || onPath.has(key(p))) continue;
      if (openNeighbours(solid, p).length === 1) deadEnds.push(p);
    }
  }
  deadEnds.sort((a, b) => (fromPath.get(key(b)) ?? 0) - (fromPath.get(key(a)) ?? 0) || a.y - b.y || a.x - b.x);
  const secret = deadEnds[0] ?? { x: 1, y: h - 2 };

  // Spread the bonus items out: greedily take dead ends that are not too close to one already chosen.
  const bonus: Pt[] = [];
  for (const d of deadEnds.slice(1)) {
    if (bonus.length >= 6) break;
    if (bonus.some((b) => Math.abs(b.x - d.x) + Math.abs(b.y - d.y) < 6)) continue;
    if (Math.abs(d.x - start.x) + Math.abs(d.y - start.y) < 4) continue;
    bonus.push(d);
  }
  // Top up from remaining dead ends if the spacing rule left us short.
  for (const d of deadEnds.slice(1)) {
    if (bonus.length >= 5) break;
    if (!bonus.includes(d)) bonus.push(d);
  }

  return { w, h, solid, start, exit, path, stations, doors, bonus, secret };
}
