/** Small text helpers shared by the UI and the game scenes. */

export interface TextVars {
  girlfriend: string;
  boyfriend: string;
  anniversary: string;
}

/** Replaces {girlfriend}, {boyfriend} and {anniversary} tokens. Unknown tokens stay untouched. */
export function fmt(text: string, vars: TextVars): string {
  return text.replace(/\{(girlfriend|boyfriend|anniversary)\}/g, (_m, key: keyof TextVars) => vars[key]);
}

/** Deterministic seeded pseudo random generator (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle that does not mutate the input. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick<T>(items: readonly T[], rng: () => number = Math.random): T {
  return items[Math.floor(rng() * items.length)];
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
