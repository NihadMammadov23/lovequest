import type { SaveData } from "./types";
import { SECRET_HEART_IDS } from "./types";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  /** Pure check against persisted save data, so it can be tested and never depends on live game state. */
  check: (save: SaveData) => boolean;
}

export const SNACK_CHAMPION_SCORE = 600;
export const COMBO_KING_COMBO = 15;

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_victory",
    name: "First Victory",
    description: "Complete any level.",
    check: (s) => Object.values(s.completed).some(Boolean),
  },
  {
    id: "heart_collector",
    name: "Heart Collector",
    description: "Collect all 15 hearts in The First Meet in a single run.",
    check: (s) => s.collectibles[1] >= 15,
  },
  {
    id: "maze_master",
    name: "Maze Master",
    description: "Finish the Memory Maze with 2 mistakes or fewer.",
    check: (s) => s.completed[2] && s.records.l2Mistakes !== null && s.records.l2Mistakes <= 2,
  },
  {
    id: "snack_champion",
    name: "Snack Champion",
    description: `Score ${SNACK_CHAMPION_SCORE}+ in Snack Attack.`,
    check: (s) => (s.miniScores.snack ?? 0) >= SNACK_CHAMPION_SCORE,
  },
  {
    id: "boss_slayer",
    name: "Boss Slayer",
    description: "Defeat the Boyfriend Boss.",
    check: (s) => s.completed[4],
  },
  {
    id: "perfect_run",
    name: "Perfect Run",
    description: "Finish any level without taking damage or making a mistake.",
    check: (s) => Object.values(s.perfect).some(Boolean),
  },
  {
    id: "combo_king",
    name: "Combo Queen",
    description: `Reach a ${COMBO_KING_COMBO}-hit combo.`,
    check: (s) => s.records.maxCombo >= COMBO_KING_COMBO,
  },
  {
    id: "translator_pro",
    name: "Boyfriend Whisperer",
    description: "Answer every Boyfriend Translator question correctly.",
    check: (s) => s.records.translatorPerfect >= 1,
  },
  {
    id: "secret_hunter",
    name: "Secret Hunter",
    description: "Find all five secret hearts.",
    check: (s) => SECRET_HEART_IDS.every((id) => s.secretHearts.includes(id)),
  },
  {
    id: "gold_rush",
    name: "Gold Rush",
    description: "Earn gold medals on three levels.",
    check: (s) => Object.values(s.medals).filter((m) => m === "gold").length >= 3,
  },
  {
    id: "love_champion",
    name: "Love Champion",
    description: "Complete all four levels.",
    check: (s) => Object.values(s.completed).every(Boolean),
  },
];

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Returns ids of achievements that are now earned but were not yet recorded. */
export function newlyUnlocked(save: SaveData): string[] {
  return ACHIEVEMENTS.filter((a) => !save.achievements.includes(a.id) && a.check(save)).map((a) => a.id);
}
