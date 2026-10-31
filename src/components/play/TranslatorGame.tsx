"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameConfig, TranslatorItem } from "@/config/gameConfig";
import { audio } from "@/lib/audio";
import { TRANSLATOR_POINTS, translatorPoints } from "@/lib/scoring";
import { fmt, shuffle, type TextVars } from "@/lib/text";
import type { MiniGameResult } from "@/lib/types";
import { CharacterCanvas } from "../ui/pixelArt";

interface Props {
  config: GameConfig;
  /** Called once per finished run so the score is saved even if the player leaves right away. */
  onRecord: (result: MiniGameResult) => void;
  onQuit: () => void;
}

interface Round {
  message: string;
  options: string[];
  correctIndex: number;
  reaction: string;
}

const ROUNDS = 8;

function prepare(items: TranslatorItem[], vars: TextVars): Round[] {
  return shuffle(items)
    .slice(0, ROUNDS)
    .map((it) => {
      const order = shuffle(it.options.map((text, i) => ({ text, ok: i === it.correctIndex })));
      return {
        message: fmt(it.message, vars),
        options: order.map((o) => fmt(o.text, vars)),
        correctIndex: order.findIndex((o) => o.ok),
        reaction: fmt(it.reaction, vars),
      };
    });
}

/** Boyfriend Translator: pick what he really means. Plain HTML so all text stays accessible. */
export default function TranslatorGame({ config, onRecord, onQuit }: Props) {
  const vars: TextVars = { girlfriend: config.girlfriend.name, boyfriend: config.boyfriend.name, anniversary: config.anniversary.display };
  const [rounds, setRounds] = useState<Round[]>(() => prepare(config.translator, vars));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [gain, setGain] = useState(0);
  const [done, setDone] = useState(false);
  const round = rounds[index];
  const answered = picked !== null;
  const last = index === rounds.length - 1;
  const perfect = correct === rounds.length;

  const choose = (i: number) => {
    if (answered || !round) return;
    setPicked(i);
    if (i === round.correctIndex) {
      const pts = translatorPoints(streak);
      setGain(pts);
      setScore((s) => s + pts);
      setCorrect((c) => c + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      audio.sfx("correct");
    } else {
      setGain(0);
      setStreak(0);
      audio.sfx("wrong");
    }
  };

  const next = () => {
    if (!answered) return;
    if (last) {
      setDone(true);
      audio.sfx("win");
      return;
    }
    setIndex((n) => n + 1);
    setPicked(null);
  };

  const restart = () => {
    setRounds(prepare(config.translator, vars));
    setIndex(0);
    setPicked(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrect(0);
    setDone(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !round) return;
      if (e.key >= "1" && e.key <= String(round.options.length)) choose(Number(e.key) - 1);
      else if (e.key === "Enter" && answered && document.activeElement?.tagName !== "BUTTON") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, picked, done, streak]);

  const result: MiniGameResult = useMemo(
    () => ({
      game: "translator",
      score,
      collectibles: correct,
      secretHearts: [],
      records: perfect ? { translatorPerfect: 1, maxCombo: bestStreak } : { maxCombo: bestStreak },
    }),
    [score, correct, perfect, bestStreak],
  );

  useEffect(() => {
    if (done) onRecord(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) {
    return (
      <div className="lq-pop px-panel mx-auto w-full max-w-xl p-5 text-center" role="region" aria-label="Translator results">
        <h2 className="font-pixel mb-4 text-sm text-[#ffe0ec]">TRANSLATION COMPLETE</h2>
        <p className="font-pixel mb-1 text-2xl text-[#ffe94d]">{score}</p>
        <p className="mb-4 text-[clamp(20px,2.4vw,26px)]">
          {correct} of {rounds.length} correct · best streak {bestStreak}
        </p>
        <p className="mb-5 text-[clamp(18px,2.2vw,24px)] text-[#d9ccff]">
          {perfect
            ? `Flawless! You are officially fluent in ${config.boyfriend.name}.`
            : correct >= rounds.length / 2
              ? `Pretty good! ${config.boyfriend.name} is mostly an open book.`
              : `${config.boyfriend.name} remains a mystery. Study more!`}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className="px-btn" onClick={onQuit} autoFocus>
            CONTINUE
          </button>
          <button type="button" className="px-btn px-btn-alt" onClick={restart}>
            PLAY AGAIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-panel mx-auto w-full max-w-2xl p-4 sm:p-6" role="region" aria-label="Boyfriend Translator">
      <div className="mb-3 flex items-center justify-between font-pixel text-[10px] text-[#d9ccff]">
        <span>
          ROUND {index + 1}/{rounds.length}
        </span>
        <span>SCORE {score}</span>
        <span>STREAK {streak}</span>
      </div>

      <div className="flex items-start gap-4">
        <div className="hidden shrink-0 sm:block">
          <CharacterCanvas who="boy" look={config.boyfriend.look} beard={config.boyfriend.beard} wristband={config.boyfriend.wristband} pose={answered && picked !== round.correctIndex ? "hurt" : "idle"} scale={5} label={config.boyfriend.name} />
        </div>
        <div className="relative flex-1">
          <p className="font-pixel mb-2 text-[9px] text-[#a98bff]">{config.boyfriend.name.toUpperCase()} SAYS:</p>
          <blockquote className="border-4 border-[#ffd2a8] bg-[#2d1470] p-3 text-[clamp(22px,3vw,32px)] leading-snug text-white">{round.message}</blockquote>
        </div>
      </div>

      <p className="font-pixel mt-4 mb-2 text-[9px] text-[#a98bff]">WHAT HE ACTUALLY MEANS:</p>
      <div className="grid gap-3" role="group" aria-label="Interpretations">
        {round.options.map((opt, i) => {
          const isRight = answered && i === round.correctIndex;
          const isWrongPick = answered && picked === i && i !== round.correctIndex;
          return (
            <button
              key={`${index}-${i}`}
              type="button"
              disabled={answered}
              onClick={() => choose(i)}
              className={`px-btn text-left ${isRight ? "px-btn-mint" : isWrongPick ? "opacity-60 lq-shake" : "px-btn-alt"}`}
            >
              <span className="mr-2 opacity-70">{i + 1}.</span>
              <span className="font-body text-[clamp(18px,2.4vw,24px)] normal-case tracking-normal">{opt}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[4.5rem]" aria-live="polite">
        {answered && (
          <p className={`lq-pop border-l-4 pl-3 text-[clamp(18px,2.3vw,24px)] ${picked === round.correctIndex ? "border-[#7dffcf] text-[#b8ffe6]" : "border-[#ff8a7a] text-[#ffc7bf]"}`}>
            {picked === round.correctIndex ? `Correct! +${gain}${gain > TRANSLATOR_POINTS ? " (streak bonus)" : ""}. ` : "Not quite. "}
            {round.reaction}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button type="button" className="px-btn px-btn-alt px-btn-sm" onClick={onQuit}>
          BACK
        </button>
        <button type="button" className="px-btn" disabled={!answered} onClick={next}>
          {last ? "FINISH" : "NEXT"}
        </button>
      </div>
    </div>
  );
}
