import { describe, expect, it } from "vitest";
import { bfs, buildMaze } from "./maze";

const k = (p: { x: number; y: number }) => `${p.x},${p.y}`;

describe("memory maze", () => {
  const m = buildMaze();

  it("is a fully connected maze with solid borders", () => {
    const { dist } = bfs(m.solid, m.start);
    let open = 0;
    m.solid.forEach((row, y) =>
      row.forEach((s, x) => {
        if (!s) {
          open++;
          expect(dist.has(`${x},${y}`), `tile ${x},${y} unreachable`).toBe(true);
        }
      }),
    );
    expect(open).toBeGreaterThan(100);
    for (let x = 0; x < m.w; x++) {
      expect(m.solid[0][x]).toBe(true);
      expect(m.solid[m.h - 1][x]).toBe(true);
    }
    for (let y = 0; y < m.h; y++) {
      expect(m.solid[y][0]).toBe(true);
      expect(m.solid[y][m.w - 1]).toBe(true);
    }
  });

  it("every door genuinely blocks the way to the exit", () => {
    for (const d of m.doors) {
      const { dist } = bfs(m.solid, m.start, new Set([k(d)]));
      expect(dist.has(k(m.exit)), `door ${d.n} can be bypassed`).toBe(false);
    }
  });

  it("stations and keys come before their doors, in order", () => {
    const idx = (p: { x: number; y: number }) => m.path.findIndex((q) => q.x === p.x && q.y === p.y);
    expect(m.doors).toHaveLength(3);
    expect(m.stations).toHaveLength(3);
    let prev = -1;
    for (let i = 0; i < 3; i++) {
      const s = idx(m.stations[i]);
      const d = idx(m.doors[i]);
      expect(s, `station ${i + 1} not on route`).toBeGreaterThan(prev);
      expect(d, `door ${i + 1} not on route`).toBeGreaterThan(s);
      prev = d;
    }
    // Station N is reachable with only keys < N (i.e. before door N).
    m.stations.forEach((s, i) => {
      const blocked = new Set(m.doors.slice(i).map(k));
      expect(bfs(m.solid, m.start, blocked).dist.has(k(s))).toBe(true);
    });
  });

  it("optional collectibles and the secret heart are reachable and off the main route", () => {
    const { dist } = bfs(m.solid, m.start);
    const route = new Set(m.path.map(k));
    expect(m.bonus.length).toBeGreaterThanOrEqual(4);
    for (const b of [...m.bonus, m.secret]) {
      expect(dist.has(k(b))).toBe(true);
      expect(route.has(k(b))).toBe(false);
    }
    expect(new Set([...m.bonus, m.secret].map(k)).size).toBe(m.bonus.length + 1);
  });

  it("is deterministic", () => {
    expect(buildMaze().path).toEqual(buildMaze().path);
    expect(buildMaze(1).path).not.toEqual(buildMaze(2).path);
  });
});
