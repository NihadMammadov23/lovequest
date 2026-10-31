import { gameConfig, type GameConfig, type QuizQuestion, type TranslatorItem } from "./gameConfig";

const HEX = /^#[0-9a-fA-F]{6}$/;
const PHOTO_PATH = /^\/photos\/[A-Za-z0-9._\-]+\.(jpe?g|png|webp|gif)$/i;

/** Only plain https links are allowed. Returns the normalised URL or null. */
export function safeUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Only files directly inside /photos/ are allowed (no traversal, no external hosts). */
export function safePhotoPath(path: unknown): string | null {
  if (typeof path !== "string") return null;
  const p = path.trim();
  if (p.includes("..") || !PHOTO_PATH.test(p)) return null;
  return p;
}

function color(value: string, fallback: string, warnings: string[], label: string): string {
  if (HEX.test(value)) return value;
  warnings.push(`${label}: "${value}" is not a #rrggbb colour, using ${fallback}.`);
  return fallback;
}

function cleanQuiz(items: QuizQuestion[], warnings: string[]): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  items.forEach((q, i) => {
    const options = Array.isArray(q.options) ? q.options.filter((o) => typeof o === "string" && o.trim()).slice(0, 4) : [];
    if (typeof q.question !== "string" || !q.question.trim() || options.length < 2) {
      warnings.push(`quiz[${i}] needs a question and at least 2 options, skipped.`);
      return;
    }
    let correctIndex = q.correctIndex;
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      warnings.push(`quiz[${i}].correctIndex is out of range, using 0.`);
      correctIndex = 0;
    }
    out.push({ ...q, options, correctIndex });
  });
  return out;
}

function cleanTranslator(items: TranslatorItem[], warnings: string[]): TranslatorItem[] {
  const out: TranslatorItem[] = [];
  items.forEach((t, i) => {
    const options = Array.isArray(t.options) ? t.options.filter((o) => typeof o === "string" && o.trim()).slice(0, 4) : [];
    if (typeof t.message !== "string" || !t.message.trim() || options.length < 2) {
      warnings.push(`translator[${i}] needs a message and at least 2 options, skipped.`);
      return;
    }
    let correctIndex = t.correctIndex;
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      warnings.push(`translator[${i}].correctIndex is out of range, using 0.`);
      correctIndex = 0;
    }
    out.push({ ...t, options, correctIndex, reaction: t.reaction || "" });
  });
  return out;
}

export interface ValidatedConfig {
  config: GameConfig;
  warnings: string[];
}

/**
 * Repairs a configuration so the game can never crash on bad personalization data.
 * The input is never mutated.
 */
export function validateConfig(input: GameConfig): ValidatedConfig {
  const warnings: string[] = [];
  const c: GameConfig = JSON.parse(JSON.stringify(input)) as GameConfig;

  const defaults = gameConfig;
  for (const who of ["girlfriend", "boyfriend"] as const) {
    const look = c[who].look;
    const def = defaults[who].look;
    (Object.keys(def) as (keyof typeof def)[]).forEach((k) => {
      look[k] = color(look[k], def[k], warnings, `${who}.look.${k}`);
    });
    if (!c[who].name?.trim()) {
      warnings.push(`${who}.name is empty, using "${defaults[who].name}".`);
      c[who].name = defaults[who].name;
    }
  }

  const a = c.anniversary;
  if (!Number.isInteger(a.day) || a.day < 1 || a.day > 31 || !Number.isInteger(a.month) || a.month < 1 || a.month > 12) {
    warnings.push("anniversary day/month invalid, using defaults.");
    c.anniversary = { ...defaults.anniversary };
  }

  c.quiz = cleanQuiz(c.quiz, warnings);
  if (c.quiz.length < 6) {
    warnings.push("Fewer than 6 valid quiz questions, falling back to the default quiz.");
    c.quiz = cleanQuiz(defaults.quiz, []);
  }
  c.translator = cleanTranslator(c.translator, warnings);
  if (c.translator.length < 3) {
    warnings.push("Fewer than 3 valid translator items, falling back to the defaults.");
    c.translator = cleanTranslator(defaults.translator, []);
  }
  if (!Array.isArray(c.memories) || c.memories.length < 2) {
    warnings.push("At least 2 memories are needed, using defaults.");
    c.memories = defaults.memories;
  }
  if (!Array.isArray(c.insideJokes) || c.insideJokes.length < 1) c.insideJokes = defaults.insideJokes;
  if (!Array.isArray(c.correctReactions) || !c.correctReactions.length) c.correctReactions = defaults.correctReactions;
  if (!Array.isArray(c.incorrectReactions) || !c.incorrectReactions.length) c.incorrectReactions = defaults.incorrectReactions;

  c.championTitles = [...c.championTitles].sort((x, y) => x.minScore - y.minScore);
  if (!c.championTitles.length || c.championTitles[0].minScore > 0) {
    c.championTitles.unshift({ minScore: 0, title: "Champion" });
  }

  c.secretEndingRequiredHearts = Math.min(5, Math.max(1, Math.round(c.secretEndingRequiredHearts || 5)));

  c.photos = (c.photos || []).filter((p) => {
    const ok = safePhotoPath(p) !== null;
    if (!ok) warnings.push(`photos: "${p}" is not a valid /photos/... path, ignored.`);
    return ok;
  });

  const s = c.surprise;
  if (s.kind === "link" && !safeUrl(s.url)) {
    warnings.push("surprise.url must be a valid https:// link, falling back to a message.");
    s.kind = "message";
    s.url = undefined;
  }
  if (s.kind === "photo" && !safePhotoPath(s.photoPath)) {
    warnings.push("surprise.photoPath must be a /photos/... path, falling back to a message.");
    s.kind = "message";
    s.photoPath = undefined;
  }

  return { config: c, warnings };
}

let cached: ValidatedConfig | null = null;

/** The validated game configuration (computed once). */
export function getConfig(): GameConfig {
  if (!cached) {
    cached = validateConfig(gameConfig);
    if (cached.warnings.length && typeof console !== "undefined") {
      console.warn("[LOVE QUEST] Configuration warnings:\n - " + cached.warnings.join("\n - "));
    }
  }
  return cached.config;
}
