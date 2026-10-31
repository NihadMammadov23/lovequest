export type LevelId = 1 | 2 | 3 | 4;
export const LEVEL_IDS: readonly LevelId[] = [1, 2, 3, 4];

export type Medal = "bronze" | "silver" | "gold";
export type MiniGameId = "snack" | "hearts" | "translator";
export const MINI_GAME_IDS: readonly MiniGameId[] = ["snack", "hearts", "translator"];

export type SecretHeartId = "l1a" | "l1b" | "l2" | "l3" | "l4";
export const SECRET_HEART_IDS: readonly SecretHeartId[] = ["l1a", "l1b", "l2", "l3", "l4"];

/** Facts recorded across runs; only ever improved, never lowered. */
export interface Records {
  /** Highest combo reached in any level. */
  maxCombo: number;
  /** Fewest total mistakes in a completed Memory Maze run (null = never completed). */
  l2Mistakes: number | null;
  /** 1 if the Boyfriend Translator was ever finished with every answer correct. */
  translatorPerfect: number;
}

export interface LevelResult {
  level: LevelId;
  score: number;
  timeSec: number;
  /** Collectibles gathered in this run (hearts, stars, snacks...). */
  collectibles: number;
  /** True when the level was finished flawlessly (no damage / no mistakes). */
  perfect: boolean;
  /** Secret hearts found in this run. */
  secretHearts: SecretHeartId[];
  records?: Partial<{ maxCombo: number; l2Mistakes: number; translatorPerfect: number }>;
  /** Extra numbers for the results screen (label -> value). */
  detail: Record<string, number>;
}

export interface MiniGameResult {
  game: MiniGameId;
  score: number;
  collectibles: number;
  secretHearts: SecretHeartId[];
  records?: Partial<{ maxCombo: number; translatorPerfect: number }>;
}

export interface Equipped {
  hat: string;
  eyewear: string;
  earrings: string;
  cape: string;
}

export interface Settings {
  muted: boolean;
  music: number; // 0..1
  sfx: number; // 0..1
}

export interface SaveData {
  version: number;
  unlockedLevel: number; // 1..4
  completed: Record<LevelId, boolean>;
  highScores: Record<LevelId, number>;
  medals: Record<LevelId, Medal | null>;
  perfect: Record<LevelId, boolean>;
  /** Best number of collectibles found in a single run, per level. */
  collectibles: Record<LevelId, number>;
  /** Best score of each Level 3 mini-game (present once played). */
  miniScores: Partial<Record<MiniGameId, number>>;
  achievements: string[];
  secretHearts: SecretHeartId[];
  cosmeticsUnlocked: string[];
  equipped: Equipped;
  settings: Settings;
  records: Records;
  flags: { seenIntro: boolean; endingSeen: boolean; secretEndingSeen: boolean };
}

export const LEVEL_NAMES: Record<LevelId, string> = {
  1: "The First Meet",
  2: "The Memory Maze",
  3: "Girlfriend vs. Chaos",
  4: "The Boyfriend Boss Fight",
};
