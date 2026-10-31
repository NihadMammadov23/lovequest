export type Ctx = CanvasRenderingContext2D;

/** Creates a canvas, draws into it with smoothing disabled, and returns it. */
export function canvasOf(w: number, h: number, draw: (g: Ctx) => void): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2D canvas is not supported in this browser");
  g.imageSmoothingEnabled = false;
  draw(g);
  return c;
}

export function rect(g: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
}

export function dot(g: Ctx, x: number, y: number, color: string): void {
  g.fillStyle = color;
  g.fillRect(x, y, 1, 1);
}

/**
 * Draws a character grid. '.' and ' ' are transparent; every other character is looked up in `pal`.
 * Unknown characters are skipped, so a typo can never throw.
 */
export function grid(g: Ctx, x: number, y: number, rows: string[], pal: Record<string, string>, flipX = false): void {
  rows.forEach((row, ry) => {
    const w = row.length;
    for (let rx = 0; rx < w; rx++) {
      const ch = row[rx];
      if (ch === "." || ch === " ") continue;
      const color = pal[ch];
      if (!color) continue;
      dot(g, x + (flipX ? w - 1 - rx : rx), y + ry, color);
    }
  });
}

function parse(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** amount in -1..1: negative darkens, positive lightens. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = parse(hex);
  const t = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  return toHex(r + (t - r) * k, g + (t - g) * k, b + (t - b) * k);
}

export function mix(a: string, b: string, k: number): string {
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return toHex(r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k);
}
