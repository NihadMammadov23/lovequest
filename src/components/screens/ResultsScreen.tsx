"use client";

import { useEffect, useState } from "react";
import { getAchievement } from "@/lib/achievements";
import { MEDAL_THRESHOLDS } from "@/lib/scoring";
import type { ApplyOutcome } from "@/lib/save";
import { formatTime } from "@/lib/text";
import { LEVEL_NAMES, type LevelId, type LevelResult, type Medal } from "@/lib/types";
import { PixelIcon } from "../ui/pixelArt";
import { usePrefersReducedMotion } from "../ui/useTypewriter";
import { medalIcon } from "./LevelSelect";
import ScreenShell from "./ScreenShell";

function rows(r: LevelResult): { label: string; value: string }[] {
  const d = r.detail;
  switch (r.level) {
    case 1:
      return [
        { label: "Hearts collected", value: `${d.hearts ?? 0} / 15` },
        { label: "Time", value: formatTime(r.timeSec) },
        { label: "Health left", value: `${d.hpLeft ?? 0} / 3` },
        { label: "Retries", value: String(d.deaths ?? 0) },
      ];
    case 2:
      return [
        { label: "Correct answers", value: String(d.correct ?? 0) },
        { label: "Quiz mistakes", value: String(d.quizMistakes ?? 0) },
        { label: "Card mistakes", value: String(d.cardMistakes ?? 0) },
        { label: "Sweets found", value: String(d.bonus ?? 0) },
        { label: "Time", value: formatTime(r.timeSec) },
      ];
    case 3:
      return [
        { label: "Snack Attack", value: String(d.snack ?? 0) },
        { label: "Heart Catcher", value: String(d.hearts ?? 0) },
        { label: "Boyfriend Translator", value: String(d.translator ?? 0) },
      ];
    case 4:
      return [
        { label: "Direct hits", value: String(d.hits ?? 0) },
        { label: "Best combo", value: `x${d.maxCombo ?? 0}` },
        { label: "Dodges", value: String(d.dodges ?? 0) },
        { label: "Health left", value: `${d.hpLeft ?? 0} / 3` },
        { label: "Time", value: formatTime(r.timeSec) },
      ];
  }
}

function nextMedal(level: LevelId, medal: Medal): string | null {
  const t = MEDAL_THRESHOLDS[level];
  if (medal === "bronze") return `Silver medal at ${t.silver}`;
  if (medal === "silver") return `Gold medal at ${t.gold}`;
  return null;
}

interface Props {
  result: LevelResult;
  outcome: ApplyOutcome;
  medal: Medal;
  onNext: () => void;
  onReplay: () => void;
  onLevels: () => void;
  isFinal: boolean;
}

export default function ResultsScreen({ result, outcome, medal, onNext, onReplay, onLevels, isFinal }: Props) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced) {
      setShown(result.score);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1100);
      setShown(Math.round(result.score * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result.score, reduced]);

  const hint = nextMedal(result.level, medal);
  return (
    <ScreenShell title="LEVEL COMPLETE!">
      <section className="px-panel lq-pop mx-auto max-w-2xl p-5 text-center sm:p-8" aria-labelledby="res-h">
        <p className="font-pixel text-[10px] text-[#ffc2d6]">LEVEL {result.level}</p>
        <h2 id="res-h" className="font-pixel mt-1 mb-5 text-xs leading-relaxed text-white sm:text-sm">
          {LEVEL_NAMES[result.level].toUpperCase()}
        </h2>
        <div className="flex items-center justify-center gap-5">
          <PixelIcon name={medalIcon(medal)} size={72} alt={`${medal} medal`} className="lq-bob" />
          <div className="text-left">
            <p className="font-pixel text-2xl text-[#ffe94d] sm:text-4xl" aria-label={`Score ${result.score}`}>
              {shown}
            </p>
            <p className="font-pixel mt-2 text-[10px] text-[#d9ccff]">{medal.toUpperCase()} MEDAL</p>
            {outcome.newHighScore && <p className="font-pixel lq-blink mt-1 text-[9px] text-[#7dffcf]">NEW HIGH SCORE!</p>}
          </div>
        </div>
        {hint && <p className="mt-3 text-[clamp(17px,2vw,21px)] text-[#a98bff]">{hint}</p>}

        <dl className="mx-auto mt-5 grid max-w-md gap-1 text-left text-[clamp(19px,2.3vw,24px)]">
          {rows(result).map((r) => (
            <div key={r.label} className="flex justify-between border-b-2 border-[#3a1a80] py-1">
              <dt className="text-[#d9ccff]">{r.label}</dt>
              <dd className="text-white">{r.value}</dd>
            </div>
          ))}
        </dl>

        {result.secretHearts.length > 0 && (
          <p className="mt-4 flex items-center justify-center gap-2 text-[clamp(18px,2.2vw,22px)] text-[#ffe94d]">
            <PixelIcon name="heartGold" size={20} /> Secret heart found this run!
          </p>
        )}

        {outcome.newAchievements.length > 0 && (
          <div className="mt-5 border-t-4 border-[#3a1a80] pt-4 text-left" aria-live="polite">
            <p className="font-pixel mb-2 text-[10px] text-[#7dffcf]">ACHIEVEMENTS UNLOCKED</p>
            <ul className="grid gap-2">
              {outcome.newAchievements.map((id) => {
                const a = getAchievement(id);
                return (
                  <li key={id} className="lq-pop flex items-start gap-3 border-2 border-[#6a3cc9] bg-[#2a1260] p-2">
                    <PixelIcon name="trophyGold" size={24} />
                    <span className="text-[clamp(18px,2.1vw,22px)]">
                      <b className="text-[#ffe94d]">{a?.name ?? id}</b>
                      <br />
                      <span className="text-[#d9ccff]">{a?.description}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="px-btn" onClick={onNext} autoFocus>
            {isFinal ? "CONTINUE ▶" : "NEXT LEVEL ▶"}
          </button>
          <button type="button" className="px-btn px-btn-alt" onClick={onReplay}>
            REPLAY
          </button>
          <button type="button" className="px-btn px-btn-alt" onClick={onLevels}>
            LEVELS
          </button>
        </div>
      </section>
    </ScreenShell>
  );
}
