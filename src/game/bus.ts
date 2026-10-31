import type { LevelResult, MiniGameResult, SecretHeartId } from "@/lib/types";

export interface HudState {
  score: number;
  hp: number;
  maxHp: number;
  timeSec: number;
  /** Free-form status chips, e.g. hearts 3/15, keys 1/3, combo x4. */
  chips: { label: string; value: string }[];
  /** "down" means timeSec is the time remaining (countdown games). */
  timeMode?: "up" | "down";
  /** Optional boss health 0..1. */
  boss?: { name: string; ratio: number; phase: string };
}

export interface QuizPayload {
  station: string;
  title: string;
  questions: { question: string; options: string[]; correctIndex: number; correctReaction: string; wrongReaction: string }[];
}

export interface CardsPayload {
  station: string;
  title: string;
  pairs: number;
  seconds: number;
}

export interface DialoguePayload {
  title: string;
  text: string;
}

export type GameEvents = {
  hud: HudState;
  dialogue: DialoguePayload;
  quiz: QuizPayload;
  cards: CardsPayload;
  toast: { text: string };
  secretHeart: { id: SecretHeartId };
  levelComplete: LevelResult;
  miniGameComplete: MiniGameResult;
  defeat: { reason: string };
  ready: undefined;
  // UI -> game
  pause: undefined;
  resume: undefined;
  restart: undefined;
  dialogueClosed: undefined;
  quizResult: { station: string; correct: number; mistakes: number };
  cardsResult: { station: string; mistakes: number; secondsLeft: number; solved: boolean };
};

type Handler<T> = (payload: T) => void;

/** Tiny typed event emitter that connects the Phaser scenes with the React UI. */
export class GameBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => {
      set?.delete(handler as Handler<never>);
    };
  }

  emit<K extends keyof GameEvents>(event: K, ...args: GameEvents[K] extends undefined ? [] : [GameEvents[K]]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of Array.from(set)) (h as Handler<GameEvents[K] | undefined>)(args[0]);
  }

  clear(): void {
    this.handlers.clear();
  }
}
