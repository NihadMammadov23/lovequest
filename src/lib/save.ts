import { newlyUnlocked } from "./achievements";
import { syncCosmetics, COSMETIC_SLOTS, isValidCosmetic } from "./cosmetics";
import { betterMedal, level3Total, medalFor } from "./scoring";
import {
  LEVEL_IDS,
  MINI_GAME_IDS,
  SECRET_HEART_IDS,
  type Equipped,
  type LevelId,
  type LevelResult,
  type Medal,
  type MiniGameResult,
  type SaveData,
  type SecretHeartId,
} from "./types";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "love-quest-save";
export const CORRUPT_KEY = "love-quest-save-corrupt";

const DEFAULT_EQUIPPED: Equipped = { hat: "none", eyewear: "none", earrings: "drops", cape: "none" };

function perLevel<T>(value: T): Record<LevelId, T> {
  return { 1: value, 2: value, 3: value, 4: value };
}

export function defaultSave(equipped: Equipped = DEFAULT_EQUIPPED): SaveData {
  return syncCosmetics({
    version: SAVE_VERSION,
    unlockedLevel: 1,
    completed: perLevel(false),
    highScores: perLevel(0),
    medals: perLevel<Medal | null>(null),
    perfect: perLevel(false),
    collectibles: perLevel(0),
    miniScores: {},
    achievements: [],
    secretHearts: [],
    cosmeticsUnlocked: [],
    equipped: { ...equipped },
    settings: { muted: false, music: 0.5, sfx: 0.7 },
    records: { maxCombo: 0, l2Mistakes: null, translatorPerfect: 0 },
    flags: { seenIntro: false, endingSeen: false, secretEndingSeen: false },
  });
}

// ---------------------------------------------------------------------------
// Validation / migration
// ---------------------------------------------------------------------------

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function strArray(v: unknown, allowed?: readonly string[]): string[] {
  if (!Array.isArray(v)) return [];
  const out = v.filter((x): x is string => typeof x === "string" && (!allowed || allowed.includes(x)));
  return Array.from(new Set(out));
}

/**
 * Turns anything (null, garbage, an older save) into a valid SaveData.
 * Never throws. Unknown future versions are discarded.
 */
export function sanitizeSave(raw: unknown): SaveData {
  const base = defaultSave();
  if (!isObj(raw)) return base;
  const version = raw.version;
  if (typeof version !== "number" || !Number.isFinite(version) || version < 1 || version > SAVE_VERSION) return base;

  const out: SaveData = { ...base, version: SAVE_VERSION };

  for (const id of LEVEL_IDS) {
    const key = String(id);
    const completed = isObj(raw.completed) ? raw.completed[key] : undefined;
    const score = isObj(raw.highScores) ? raw.highScores[key] : undefined;
    const medal = isObj(raw.medals) ? raw.medals[key] : undefined;
    const perfect = isObj(raw.perfect) ? raw.perfect[key] : undefined;
    const coll = isObj(raw.collectibles) ? raw.collectibles[key] : undefined;
    out.completed[id] = bool(completed, false);
    out.highScores[id] = Math.round(num(score, 0, 0, 1_000_000));
    out.medals[id] = medal === "bronze" || medal === "silver" || medal === "gold" ? medal : null;
    out.perfect[id] = bool(perfect, false);
    out.collectibles[id] = Math.round(num(coll, 0, 0, 1000));
  }

  out.miniScores = {};
  if (isObj(raw.miniScores)) {
    for (const g of MINI_GAME_IDS) {
      const v = raw.miniScores[g];
      if (typeof v === "number" && Number.isFinite(v)) out.miniScores[g] = Math.round(Math.min(1_000_000, Math.max(0, v)));
    }
  }

  out.achievements = strArray(raw.achievements);
  out.secretHearts = strArray(raw.secretHearts, SECRET_HEART_IDS) as SecretHeartId[];
  out.cosmeticsUnlocked = strArray(raw.cosmeticsUnlocked);

  if (isObj(raw.equipped)) {
    for (const slot of COSMETIC_SLOTS) {
      const v = raw.equipped[slot];
      if (typeof v === "string" && isValidCosmetic(slot, v)) out.equipped[slot] = v;
    }
  }

  if (isObj(raw.settings)) {
    out.settings = {
      muted: bool(raw.settings.muted, false),
      music: num(raw.settings.music, 0.5, 0, 1),
      sfx: num(raw.settings.sfx, 0.7, 0, 1),
    };
  }

  if (isObj(raw.records)) {
    const l2 = raw.records.l2Mistakes;
    out.records = {
      maxCombo: Math.round(num(raw.records.maxCombo, 0, 0, 100000)),
      l2Mistakes: typeof l2 === "number" && Number.isFinite(l2) ? Math.round(Math.max(0, l2)) : null,
      translatorPerfect: raw.records.translatorPerfect === 1 ? 1 : 0,
    };
  }

  if (isObj(raw.flags)) {
    out.flags = {
      seenIntro: bool(raw.flags.seenIntro, false),
      endingSeen: bool(raw.flags.endingSeen, false),
      secretEndingSeen: bool(raw.flags.secretEndingSeen, false),
    };
  }

  // Derived consistency: unlockedLevel must cover every completed level.
  let unlocked = Math.round(num(raw.unlockedLevel, 1, 1, 4));
  for (const id of LEVEL_IDS) if (out.completed[id]) unlocked = Math.max(unlocked, Math.min(4, id + 1));
  out.unlockedLevel = unlocked;

  return syncCosmetics(out);
}

// ---------------------------------------------------------------------------
// Persistence (works with any Storage-like object so it can be unit tested)
// ---------------------------------------------------------------------------

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function browserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const probe = "__lq_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null; // private mode, blocked storage...
  }
}

export function loadSave(storage: StorageLike | null = browserStorage()): SaveData {
  if (!storage) return defaultSave();
  let text: string | null = null;
  try {
    text = storage.getItem(SAVE_KEY);
  } catch {
    return defaultSave();
  }
  if (!text) return defaultSave();
  try {
    return sanitizeSave(JSON.parse(text));
  } catch {
    // Keep the broken data around for debugging instead of silently losing it.
    try {
      storage.setItem(CORRUPT_KEY, text);
    } catch {
      /* ignore */
    }
    return defaultSave();
  }
}

export function writeSave(save: SaveData, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

/** True when there is something worth continuing. */
export function hasProgress(save: SaveData): boolean {
  return (
    save.unlockedLevel > 1 ||
    Object.values(save.completed).some(Boolean) ||
    Object.values(save.highScores).some((s) => s > 0) ||
    Object.keys(save.miniScores).length > 0 ||
    save.secretHearts.length > 0
  );
}

// ---------------------------------------------------------------------------
// Progression (pure)
// ---------------------------------------------------------------------------

export function isLevelUnlocked(save: SaveData, level: LevelId): boolean {
  return level <= save.unlockedLevel;
}

export function allLevelsCompleted(save: SaveData): boolean {
  return LEVEL_IDS.every((id) => save.completed[id]);
}

export function totalScore(save: SaveData): number {
  return LEVEL_IDS.reduce((sum, id) => sum + save.highScores[id], 0);
}

export function totalCollectibles(save: SaveData): number {
  return LEVEL_IDS.reduce((sum, id) => sum + save.collectibles[id], 0);
}

export function medalCounts(save: SaveData): Record<Medal, number> {
  const counts: Record<Medal, number> = { bronze: 0, silver: 0, gold: 0 };
  for (const id of LEVEL_IDS) {
    const m = save.medals[id];
    if (m) counts[m] += 1;
  }
  return counts;
}

export function secretEndingUnlocked(save: SaveData, required: number): boolean {
  return save.secretHearts.length >= Math.min(required, SECRET_HEART_IDS.length);
}

function mergeSecretHearts(save: SaveData, found: SecretHeartId[]): SecretHeartId[] {
  return SECRET_HEART_IDS.filter((id) => save.secretHearts.includes(id) || found.includes(id));
}

function applyRecords(save: SaveData, rec?: LevelResult["records"] | MiniGameResult["records"]): SaveData["records"] {
  const r = { ...save.records };
  if (!rec) return r;
  if (typeof rec.maxCombo === "number") r.maxCombo = Math.max(r.maxCombo, Math.round(rec.maxCombo));
  if (typeof rec.translatorPerfect === "number" && rec.translatorPerfect >= 1) r.translatorPerfect = 1;
  if ("l2Mistakes" in rec && typeof rec.l2Mistakes === "number") {
    r.l2Mistakes = r.l2Mistakes === null ? rec.l2Mistakes : Math.min(r.l2Mistakes, rec.l2Mistakes);
  }
  return r;
}

export interface ApplyOutcome {
  save: SaveData;
  newAchievements: string[];
  newMedal: Medal | null;
  newHighScore: boolean;
}

function finalize(before: SaveData, after: SaveData, newMedal: Medal | null, newHighScore: boolean): ApplyOutcome {
  // Achievements can unlock others (e.g. perfect + gold rush), so iterate to a fixed point.
  let next = after;
  const unlockedNow: string[] = [];
  for (let i = 0; i < 4; i++) {
    const fresh = newlyUnlocked(next);
    if (!fresh.length) break;
    unlockedNow.push(...fresh);
    next = syncCosmetics({ ...next, achievements: [...next.achievements, ...fresh] });
  }
  next = syncCosmetics(next);
  void before;
  return { save: next, newAchievements: unlockedNow, newMedal, newHighScore };
}

/** Applies a finished level to the save (high scores, medals, unlocks, achievements). */
export function applyLevelResult(save: SaveData, result: LevelResult): ApplyOutcome {
  const id = result.level;
  const score = Math.max(0, Math.round(result.score));
  const medal = medalFor(id, score);
  const newHighScore = score > save.highScores[id];

  const next: SaveData = {
    ...save,
    completed: { ...save.completed, [id]: true },
    highScores: { ...save.highScores, [id]: Math.max(save.highScores[id], score) },
    medals: { ...save.medals, [id]: betterMedal(save.medals[id], medal) },
    perfect: { ...save.perfect, [id]: save.perfect[id] || result.perfect },
    collectibles: { ...save.collectibles, [id]: Math.max(save.collectibles[id], Math.round(result.collectibles)) },
    secretHearts: mergeSecretHearts(save, result.secretHearts),
    records: applyRecords(save, result.records),
    unlockedLevel: Math.max(save.unlockedLevel, Math.min(4, id + 1)),
  };
  const newMedal = betterMedal(save.medals[id], medal) !== save.medals[id] ? medal : null;
  return finalize(save, next, newMedal, newHighScore);
}

/** Records a finished Level 3 mini-game (best score kept, secret heart merged). */
export function applyMiniGameResult(save: SaveData, result: MiniGameResult): ApplyOutcome {
  const prev = save.miniScores[result.game];
  const score = Math.max(0, Math.round(result.score));
  const next: SaveData = {
    ...save,
    miniScores: { ...save.miniScores, [result.game]: prev === undefined ? score : Math.max(prev, score) },
    secretHearts: mergeSecretHearts(save, result.secretHearts),
    records: applyRecords(save, result.records),
  };
  return finalize(save, next, null, prev === undefined || score > prev);
}

export function allMiniGamesPlayed(save: SaveData): boolean {
  return MINI_GAME_IDS.every((g) => save.miniScores[g] !== undefined);
}

export function level3Score(save: SaveData): number {
  return level3Total(save.miniScores);
}

export function updateSettings(save: SaveData, settings: Partial<SaveData["settings"]>): SaveData {
  return {
    ...save,
    settings: {
      muted: settings.muted ?? save.settings.muted,
      music: num(settings.music, save.settings.music, 0, 1),
      sfx: num(settings.sfx, save.settings.sfx, 0, 1),
    },
  };
}

export function equipCosmetic(save: SaveData, slot: keyof Equipped, id: string): SaveData {
  if (!isValidCosmetic(slot, id) || !save.cosmeticsUnlocked.includes(`${slot}:${id}`)) return save;
  return { ...save, equipped: { ...save.equipped, [slot]: id } };
}

/** Persists a secret heart the moment it is found (so quitting mid-level never loses it). */
export function addSecretHeart(save: SaveData, id: SecretHeartId): ApplyOutcome {
  if (save.secretHearts.includes(id)) return { save, newAchievements: [], newMedal: null, newHighScore: false };
  return finalize(save, { ...save, secretHearts: mergeSecretHearts(save, [id]) }, null, false);
}

/** A brand-new game that keeps the player's audio settings. */
export function freshSave(previous: SaveData, equippedDefaults: Equipped): SaveData {
  return { ...defaultSave(equippedDefaults), settings: previous.settings };
}
