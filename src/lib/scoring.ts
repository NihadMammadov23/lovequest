import type { LevelId, Medal } from "./types";

/** Deterministic scoring rules. Everything here is a pure function. */

export const MEDAL_THRESHOLDS: Record<LevelId, { bronze: number; silver: number; gold: number }> = {
  1: { bronze: 1000, silver: 1700, gold: 2200 },
  2: { bronze: 900, silver: 1400, gold: 1900 },
  3: { bronze: 1200, silver: 2000, gold: 2800 },
  4: { bronze: 2000, silver: 3200, gold: 4400 },
};

/** Completing a level always earns at least bronze. */
export function medalFor(level: LevelId, score: number): Medal {
  const t = MEDAL_THRESHOLDS[level];
  if (score >= t.gold) return "gold";
  if (score >= t.silver) return "silver";
  return "bronze";
}

const MEDAL_RANK: Record<Medal, number> = { bronze: 1, silver: 2, gold: 3 };
export function betterMedal(a: Medal | null, b: Medal | null): Medal | null {
  if (!a) return b;
  if (!b) return a;
  return MEDAL_RANK[a] >= MEDAL_RANK[b] ? a : b;
}

/** +0.5x for every 5 consecutive successes, capped at 3x. */
export function comboMultiplier(combo: number): number {
  if (combo < 0) return 1;
  return Math.min(3, 1 + Math.floor(combo / 5) * 0.5);
}

// --- Level 1 ---------------------------------------------------------------
export const L1_HEARTS = 15;
export const L1_PAR_SECONDS = 150;

export function scoreLevel1(a: { hearts: number; timeSec: number; hpLeft: number; deaths: number }): number {
  const hearts = Math.max(0, Math.min(L1_HEARTS, a.hearts));
  const speed = Math.max(0, Math.round(L1_PAR_SECONDS - a.timeSec)) * 5;
  const health = Math.max(0, Math.min(3, a.hpLeft)) * 150;
  const penalty = Math.max(0, a.deaths) * 100;
  return Math.max(0, hearts * 100 + speed + health - penalty);
}

// --- Level 2 ---------------------------------------------------------------
export const L2_PAR_SECONDS = 240;

export function scoreLevel2(a: {
  correct: number;
  quizMistakes: number;
  cardMistakes: number;
  cardSecondsLeft: number;
  collectibles: number;
  timeSec: number;
}): number {
  const quiz = a.correct * 150 - a.quizMistakes * 50;
  const cards = Math.max(0, 300 - a.cardMistakes * 25) + Math.max(0, Math.round(a.cardSecondsLeft)) * 3;
  const bonus = a.collectibles * 100;
  const speed = Math.max(0, Math.round(L2_PAR_SECONDS - a.timeSec)) * 2;
  return Math.max(0, quiz + cards + bonus + speed);
}

// --- Level 3 mini-games ----------------------------------------------------
export const SNACK_POINTS = 10;
export const SNACK_BAD_PENALTY = 20;
export const HEARTS_POINTS = 10;
export const HEARTS_BONUS_POINTS = 50;
export const TRANSLATOR_POINTS = 100;
export const TRANSLATOR_STREAK_BONUS = 25;

export function snackCatchPoints(combo: number): number {
  return Math.round(SNACK_POINTS * comboMultiplier(combo));
}

export function heartCatchPoints(combo: number, bonus: boolean): number {
  return Math.round((bonus ? HEARTS_BONUS_POINTS : HEARTS_POINTS) * comboMultiplier(combo));
}

/** Streak bonus applies from the third consecutive correct answer onwards. */
export function translatorPoints(streakBeforeAnswer: number): number {
  return TRANSLATOR_POINTS + (streakBeforeAnswer >= 2 ? TRANSLATOR_STREAK_BONUS * (streakBeforeAnswer - 1) : 0);
}

export function level3Total(scores: Partial<Record<"snack" | "hearts" | "translator", number>>): number {
  return (scores.snack ?? 0) + (scores.hearts ?? 0) + (scores.translator ?? 0);
}

// --- Level 4 ---------------------------------------------------------------
export const BOSS_PAR_SECONDS = 150;
export const BOSS_HIT_POINTS = 50;
export const BOSS_DODGE_POINTS = 40;
export const BOSS_HP_POINTS = 250;

export function scoreBoss(a: { hitPoints: number; dodges: number; hpLeft: number; timeSec: number }): number {
  const time = Math.max(0, Math.round(BOSS_PAR_SECONDS - a.timeSec)) * 8;
  return Math.max(0, a.hitPoints + a.dodges * BOSS_DODGE_POINTS + Math.max(0, a.hpLeft) * BOSS_HP_POINTS + time);
}

/** Points for one successful boss hit at the given combo. */
export function bossHitPoints(combo: number): number {
  return Math.round(BOSS_HIT_POINTS * comboMultiplier(combo));
}
