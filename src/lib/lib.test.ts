import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, newlyUnlocked } from "./achievements";
import { COSMETICS, syncCosmetics, unlockedCosmeticKeys } from "./cosmetics";
import {
  CORRUPT_KEY,
  SAVE_KEY,
  SAVE_VERSION,
  allLevelsCompleted,
  allMiniGamesPlayed,
  applyLevelResult,
  applyMiniGameResult,
  defaultSave,
  equipCosmetic,
  hasProgress,
  isLevelUnlocked,
  level3Score,
  loadSave,
  medalCounts,
  sanitizeSave,
  secretEndingUnlocked,
  totalScore,
  writeSave,
  type StorageLike,
} from "./save";
import {
  MEDAL_THRESHOLDS,
  bossHitPoints,
  comboMultiplier,
  heartCatchPoints,
  level3Total,
  medalFor,
  scoreBoss,
  scoreLevel1,
  scoreLevel2,
  snackCatchPoints,
  translatorPoints,
} from "./scoring";
import { LEVEL_IDS, SECRET_HEART_IDS, type LevelId, type LevelResult } from "./types";
import { fmt, makeRng, shuffle } from "./text";
import { gameConfig } from "../config/gameConfig";
import { safePhotoPath, safeUrl, validateConfig } from "../config/validate";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

function result(level: LevelId, score: number, extra: Partial<LevelResult> = {}): LevelResult {
  return { level, score, timeSec: 60, collectibles: 0, perfect: false, secretHearts: [], detail: {}, ...extra };
}

describe("scoring", () => {
  it("combo multiplier grows every 5 and caps at 3", () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(4)).toBe(1);
    expect(comboMultiplier(5)).toBe(1.5);
    expect(comboMultiplier(10)).toBe(2);
    expect(comboMultiplier(1000)).toBe(3);
  });

  it("level 1 rewards hearts, speed and health, and penalises deaths", () => {
    expect(scoreLevel1({ hearts: 15, timeSec: 90, hpLeft: 3, deaths: 0 })).toBe(1500 + 300 + 450);
    expect(scoreLevel1({ hearts: 0, timeSec: 999, hpLeft: 0, deaths: 3 })).toBe(0);
    expect(scoreLevel1({ hearts: 15, timeSec: 90, hpLeft: 3, deaths: 1 })).toBe(2150);
    // clamps impossible inputs
    expect(scoreLevel1({ hearts: 99, timeSec: 0, hpLeft: 9, deaths: 0 })).toBe(1500 + 750 + 450);
  });

  it("level 2 never goes negative and rewards clean runs", () => {
    const clean = scoreLevel2({ correct: 6, quizMistakes: 0, cardMistakes: 0, cardSecondsLeft: 30, collectibles: 4, timeSec: 120 });
    const sloppy = scoreLevel2({ correct: 6, quizMistakes: 6, cardMistakes: 12, cardSecondsLeft: 0, collectibles: 0, timeSec: 400 });
    expect(clean).toBeGreaterThan(sloppy);
    expect(scoreLevel2({ correct: 0, quizMistakes: 50, cardMistakes: 50, cardSecondsLeft: 0, collectibles: 0, timeSec: 999 })).toBe(0);
  });

  it("mini-game points follow the combo", () => {
    expect(snackCatchPoints(0)).toBe(10);
    expect(snackCatchPoints(10)).toBe(20);
    expect(heartCatchPoints(0, true)).toBe(50);
    expect(heartCatchPoints(5, false)).toBe(15);
    expect(translatorPoints(0)).toBe(100);
    expect(translatorPoints(1)).toBe(100);
    expect(translatorPoints(2)).toBe(125);
    expect(translatorPoints(3)).toBe(150);
    expect(level3Total({ snack: 1, hearts: 2, translator: 3 })).toBe(6);
    expect(level3Total({})).toBe(0);
  });

  it("boss score combines hits, dodges, health and time", () => {
    expect(bossHitPoints(0)).toBe(50);
    expect(bossHitPoints(10)).toBe(100);
    expect(scoreBoss({ hitPoints: 1500, dodges: 10, hpLeft: 3, timeSec: 100 })).toBe(1500 + 400 + 750 + 400);
    expect(scoreBoss({ hitPoints: 0, dodges: 0, hpLeft: 0, timeSec: 9999 })).toBe(0);
  });

  it("medals are monotonic and thresholds are ordered", () => {
    for (const id of LEVEL_IDS) {
      const t = MEDAL_THRESHOLDS[id];
      expect(t.bronze).toBeLessThan(t.silver);
      expect(t.silver).toBeLessThan(t.gold);
      expect(medalFor(id, 0)).toBe("bronze");
      expect(medalFor(id, t.silver)).toBe("silver");
      expect(medalFor(id, t.gold)).toBe("gold");
    }
  });
});

describe("save validation", () => {
  it("returns defaults for garbage, null and unknown versions", () => {
    const def = defaultSave();
    expect(sanitizeSave(null)).toEqual(def);
    expect(sanitizeSave("nope")).toEqual(def);
    expect(sanitizeSave([])).toEqual(def);
    expect(sanitizeSave({ version: 999, unlockedLevel: 4 })).toEqual(def);
    expect(sanitizeSave({ unlockedLevel: 4 })).toEqual(def);
  });

  it("repairs bad fields without losing good ones", () => {
    const s = sanitizeSave({
      version: 1,
      unlockedLevel: "lots",
      completed: { 1: true, 2: "yes" },
      highScores: { 1: 1234.6, 2: -50, 3: Infinity },
      medals: { 1: "gold", 2: "platinum" },
      secretHearts: ["l1a", "l1a", "hax"],
      equipped: { hat: "crown-of-lies", earrings: "stars" },
      settings: { muted: "x", music: 9, sfx: -1 },
      records: { maxCombo: 12, l2Mistakes: "none" },
    });
    expect(s.completed[1]).toBe(true);
    expect(s.completed[2]).toBe(false);
    expect(s.highScores[1]).toBe(1235);
    expect(s.highScores[2]).toBe(0);
    expect(s.highScores[3]).toBe(0);
    expect(s.medals[1]).toBe("gold");
    expect(s.medals[2]).toBeNull();
    expect(s.secretHearts).toEqual(["l1a"]);
    expect(s.equipped.hat).toBe("none"); // invalid hat repaired
    expect(s.settings).toEqual({ muted: false, music: 1, sfx: 0 });
    expect(s.records.maxCombo).toBe(12);
    expect(s.records.l2Mistakes).toBeNull();
    expect(s.unlockedLevel).toBe(2); // completed level 1 unlocks level 2
    expect(s.version).toBe(SAVE_VERSION);
  });

  it("does not equip cosmetics that are still locked", () => {
    const s = sanitizeSave({ version: 1, equipped: { hat: "crown" } });
    expect(s.equipped.hat).toBe("none");
  });

  it("round-trips through storage and survives corruption", () => {
    const storage = memoryStorage();
    expect(loadSave(storage)).toEqual(defaultSave());
    const saved = applyLevelResult(defaultSave(), result(1, 2300, { perfect: true, collectibles: 15 })).save;
    expect(writeSave(saved, storage)).toBe(true);
    expect(loadSave(storage)).toEqual(saved);

    storage.data[SAVE_KEY] = "{not json";
    expect(loadSave(storage)).toEqual(defaultSave());
    expect(storage.data[CORRUPT_KEY]).toBe("{not json");
  });

  it("works when storage is unavailable", () => {
    expect(loadSave(null)).toEqual(defaultSave());
    expect(writeSave(defaultSave(), null)).toBe(false);
  });

  it("hasProgress reflects real progress only", () => {
    expect(hasProgress(defaultSave())).toBe(false);
    expect(hasProgress(applyLevelResult(defaultSave(), result(1, 100)).save)).toBe(true);
  });
});

describe("progression", () => {
  it("unlocks levels one at a time and completes the game from a fresh save", () => {
    let s = defaultSave();
    expect(isLevelUnlocked(s, 1)).toBe(true);
    expect(isLevelUnlocked(s, 2)).toBe(false);
    for (const id of LEVEL_IDS) {
      expect(isLevelUnlocked(s, id)).toBe(true);
      s = applyLevelResult(s, result(id, 1000)).save;
      expect(s.completed[id]).toBe(true);
    }
    expect(allLevelsCompleted(s)).toBe(true);
    expect(s.unlockedLevel).toBe(4);
    expect(totalScore(s)).toBe(4000);
    expect(s.achievements).toContain("love_champion");
  });

  it("keeps the best score and medal when replaying", () => {
    let s = applyLevelResult(defaultSave(), result(1, 2300)).save;
    expect(s.medals[1]).toBe("gold");
    const again = applyLevelResult(s, result(1, 500));
    s = again.save;
    expect(again.newHighScore).toBe(false);
    expect(s.highScores[1]).toBe(2300);
    expect(s.medals[1]).toBe("gold");
    expect(medalCounts(s)).toEqual({ bronze: 0, silver: 0, gold: 1 });
  });

  it("level 3 needs all three mini-games and keeps best scores", () => {
    let s = defaultSave();
    s = applyMiniGameResult(s, { game: "snack", score: 400, collectibles: 10, secretHearts: [] }).save;
    s = applyMiniGameResult(s, { game: "snack", score: 300, collectibles: 5, secretHearts: [] }).save;
    expect(s.miniScores.snack).toBe(400);
    expect(allMiniGamesPlayed(s)).toBe(false);
    s = applyMiniGameResult(s, { game: "hearts", score: 500, collectibles: 20, secretHearts: ["l3"] }).save;
    s = applyMiniGameResult(s, { game: "translator", score: 900, collectibles: 8, secretHearts: [], records: { translatorPerfect: 1 } }).save;
    expect(allMiniGamesPlayed(s)).toBe(true);
    expect(level3Score(s)).toBe(1800);
    expect(s.secretHearts).toEqual(["l3"]);
    expect(s.achievements).toContain("translator_pro");
  });

  it("secret ending unlocks after the required number of hearts", () => {
    let s = defaultSave();
    expect(secretEndingUnlocked(s, 5)).toBe(false);
    s = applyLevelResult(s, result(1, 1000, { secretHearts: ["l1a", "l1b"] })).save;
    s = applyLevelResult(s, result(2, 1000, { secretHearts: ["l2"] })).save;
    s = applyMiniGameResult(s, { game: "hearts", score: 1, collectibles: 1, secretHearts: ["l3"] }).save;
    expect(secretEndingUnlocked(s, 5)).toBe(false);
    s = applyLevelResult(s, result(4, 1000, { secretHearts: ["l4"] })).save;
    expect(s.secretHearts.slice().sort()).toEqual([...SECRET_HEART_IDS].sort());
    expect(secretEndingUnlocked(s, 5)).toBe(true);
    expect(s.achievements).toContain("secret_hunter");
  });
});

describe("achievements", () => {
  it("every achievement can actually be unlocked", () => {
    // Build a save that satisfies every condition to prove each check is reachable.
    let s = defaultSave();
    s = applyLevelResult(s, result(1, 2500, { perfect: true, collectibles: 15, secretHearts: ["l1a", "l1b"], records: { maxCombo: 15 } })).save;
    s = applyLevelResult(s, result(2, 2000, { records: { l2Mistakes: 1 }, secretHearts: ["l2"] })).save;
    s = applyMiniGameResult(s, { game: "snack", score: 700, collectibles: 1, secretHearts: [] }).save;
    s = applyMiniGameResult(s, { game: "hearts", score: 700, collectibles: 1, secretHearts: ["l3"] }).save;
    s = applyMiniGameResult(s, { game: "translator", score: 800, collectibles: 1, secretHearts: [], records: { translatorPerfect: 1 } }).save;
    s = applyLevelResult(s, result(3, 3000)).save;
    s = applyLevelResult(s, result(4, 5000, { secretHearts: ["l4"] })).save;
    for (const a of ACHIEVEMENTS) expect(s.achievements, a.id).toContain(a.id);
    expect(newlyUnlocked(s)).toEqual([]);
  });

  it("does not unlock early", () => {
    const s = defaultSave();
    expect(newlyUnlocked(s)).toEqual([]);
    const withMaze = applyLevelResult(s, result(2, 1000, { records: { l2Mistakes: 5 } })).save;
    expect(withMaze.achievements).not.toContain("maze_master");
    expect(withMaze.achievements).toContain("first_victory");
  });

  it("achievement ids are unique", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(6);
  });
});

describe("cosmetics", () => {
  it("every cosmetic is reachable through an existing achievement", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    for (const c of COSMETICS) if (c.unlockedBy) expect(ids).toContain(c.unlockedBy);
  });

  it("unlocks with achievements and can be equipped only when unlocked", () => {
    let s = defaultSave();
    expect(unlockedCosmeticKeys([])).toContain("earrings:drops");
    expect(equipCosmetic(s, "hat", "crown").equipped.hat).toBe("none");
    s = applyLevelResult(s, result(4, 3000)).save; // boss slayer
    expect(s.cosmeticsUnlocked).toContain("hat:crown");
    expect(equipCosmetic(s, "hat", "crown").equipped.hat).toBe("crown");
    expect(equipCosmetic(s, "hat", "nonsense").equipped.hat).toBe("none");
  });

  it("syncCosmetics repairs invalid equips", () => {
    const broken = { ...defaultSave(), equipped: { hat: "crown", eyewear: "none", earrings: "drops", cape: "none" } };
    expect(syncCosmetics(broken).equipped.hat).toBe("none");
  });
});

describe("config", () => {
  it("meets the personalization minimums", () => {
    expect(gameConfig.memories.length).toBeGreaterThanOrEqual(5);
    expect(gameConfig.quiz.length).toBeGreaterThanOrEqual(10);
    expect(gameConfig.insideJokes.length).toBeGreaterThanOrEqual(3);
    expect(gameConfig.girlfriend.name).toBe("Madina");
    expect(gameConfig.boyfriend.name).toBe("Nihad");
    expect(gameConfig.anniversary).toMatchObject({ day: 11, month: 7 });
  });

  it("default config validates without warnings", () => {
    const { warnings } = validateConfig(gameConfig);
    expect(warnings).toEqual([]);
  });

  it("repairs broken entries instead of crashing", () => {
    const bad = JSON.parse(JSON.stringify(gameConfig));
    bad.girlfriend.look.hair = "red";
    bad.quiz[0].correctIndex = 9;
    bad.quiz[1].options = ["only one"];
    bad.photos = ["/photos/ok.jpg", "https://evil.example/x.jpg", "/photos/../secret.png"];
    bad.surprise = { ...bad.surprise, kind: "link", url: "javascript:alert(1)" };
    const { config, warnings } = validateConfig(bad);
    expect(warnings.length).toBeGreaterThan(0);
    expect(config.girlfriend.look.hair).toBe(gameConfig.girlfriend.look.hair);
    expect(config.quiz[0].correctIndex).toBe(0);
    expect(config.quiz.every((q) => q.options.length >= 2)).toBe(true);
    expect(config.photos).toEqual(["/photos/ok.jpg"]);
    expect(config.surprise.kind).toBe("message");
  });

  it("accepts only https links and local photos", () => {
    expect(safeUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeUrl("http://example.com")).toBeNull();
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,hi")).toBeNull();
    expect(safeUrl(42)).toBeNull();
    expect(safePhotoPath("/photos/a-b_c.PNG")).toBe("/photos/a-b_c.PNG");
    expect(safePhotoPath("/photos/sub/a.png")).toBeNull();
    expect(safePhotoPath("//evil.com/a.png")).toBeNull();
    expect(safePhotoPath("/photos/a.svg")).toBeNull();
  });

  it("text tokens are replaced", () => {
    const vars = { girlfriend: "A", boyfriend: "B", anniversary: "1 May" };
    expect(fmt("{girlfriend} loves {boyfriend} since {anniversary} {unknown}", vars)).toBe("A loves B since 1 May {unknown}");
  });
});

describe("utilities", () => {
  it("seeded rng is deterministic and shuffle keeps all items", () => {
    const a = makeRng(7);
    const b = makeRng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const items = [1, 2, 3, 4, 5, 6];
    const out = shuffle(items, makeRng(3));
    expect(out.slice().sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
