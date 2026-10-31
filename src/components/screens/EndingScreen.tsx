"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameConfig } from "@/config/gameConfig";
import { safePhotoPath, safeUrl } from "@/config/validate";
import type { GameBus } from "@/game/bus";
import type { InputManager } from "@/game/input";
import { medalCounts, secretEndingUnlocked, totalCollectibles, totalScore } from "@/lib/save";
import { fmt } from "@/lib/text";
import { LEVEL_IDS, type SaveData } from "@/lib/types";
import Modal from "../ui/Modal";
import PhaserHost from "../PhaserHost";
import { PixelIcon } from "../ui/pixelArt";
import { useTypewriter } from "../ui/useTypewriter";

interface Props {
  config: GameConfig;
  save: SaveData;
  bus: GameBus;
  input: InputManager;
  secret?: boolean;
  onMenu: () => void;
  onTrophies: () => void;
  onSecret: () => void;
  onLevels: () => void;
}

export function championTitle(config: GameConfig, score: number): string {
  let title = config.championTitles[0]?.title ?? "Champion";
  for (const t of config.championTitles) if (score >= t.minScore) title = t.title;
  return title;
}

type Step = "stats" | "letter";

export default function EndingScreen({ config, save, bus, input, secret = false, onMenu, onTrophies, onSecret, onLevels }: Props) {
  const vars = useMemo(() => ({ girlfriend: config.girlfriend.name, boyfriend: config.boyfriend.name, anniversary: config.anniversary.display }), [config]);
  const [step, setStep] = useState<Step>("stats");
  const [surprise, setSurprise] = useState(false);
  const score = totalScore(save);
  const medals = medalCounts(save);
  const completed = LEVEL_IDS.filter((id) => save.completed[id]).length;
  const hasSecret = secretEndingUnlocked(save, config.secretEndingRequiredHearts);

  const text = secret ? fmt(config.secretMessage, vars) : fmt(config.loveLetter, vars);
  const { shown, done, finish } = useTypewriter(text, { cps: 38, start: step === "letter" || secret });
  const showLetter = secret || step === "letter";

  // Keep keyboard focus off the Phaser canvas (it does not use the keyboard) and make Enter/Space reveal the letter.
  const letterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showLetter || done) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && document.activeElement?.tagName !== "BUTTON") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showLetter, done, finish]);

  const photos = config.photos.map(safePhotoPath).filter((p): p is string => !!p);
  const s = config.surprise;
  const url = s.kind === "link" ? safeUrl(s.url) : null;
  const photo = s.kind === "photo" ? safePhotoPath(s.photoPath) : null;

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-[#140a2e]">
      <div className="absolute inset-0">
        <PhaserHost scene="Ending" data={{ secret }} config={config} equipped={save.equipped} bus={bus} input={input} />
      </div>

      <div className="absolute inset-0 z-10 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6">
        {!showLetter ? (
          <section className="px-panel lq-pop w-full max-w-xl bg-[#1d0e45]/95 p-5 text-center sm:p-7" aria-labelledby="champ">
            <p className="font-pixel text-[10px] text-[#ffc2d6]">CHAMPIONSHIP RESULTS</p>
            <h1 id="champ" className="px-title my-3 text-base leading-relaxed sm:text-xl">
              {championTitle(config, score).toUpperCase()}
            </h1>
            <p className="mb-4 text-[clamp(20px,2.6vw,26px)] text-white">
              Congratulations, <b className="text-[#ffe94d]">{config.girlfriend.name}</b>!
            </p>
            <dl className="mx-auto grid max-w-sm gap-1 text-left text-[clamp(19px,2.4vw,24px)]">
              {[
                ["Total score", String(score)],
                ["Levels completed", `${completed} / 4`],
                ["Medals", `${medals.gold} gold · ${medals.silver} silver · ${medals.bronze} bronze`],
                ["Collectibles found", String(totalCollectibles(save))],
                ["Secret hearts", `${save.secretHearts.length} / 5`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b-2 border-[#3a1a80] py-1">
                  <dt className="text-[#d9ccff]">{k}</dt>
                  <dd className="text-right text-white">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" className="px-btn" onClick={() => setStep("letter")} autoFocus>
                READ THE LETTER ▶
              </button>
              <button type="button" className="px-btn px-btn-alt" onClick={onLevels}>
                LEVELS
              </button>
            </div>
          </section>
        ) : (
          <section
            ref={letterRef}
            className="px-panel w-full max-w-2xl bg-[#1d0e45]/95 p-5 sm:p-7"
            aria-labelledby="letter-h"
            onClick={() => !done && finish()}
          >
            <h1 id="letter-h" className="font-pixel mb-3 flex items-center gap-2 text-[11px] text-[#ffc2d6]">
              <PixelIcon name={secret ? "heartGold" : "heart"} size={18} /> {secret ? "THE SECRET MESSAGE" : "A LETTER FOR YOU"}
            </h1>
            <p className="sr-only-lq">{text}</p>
            <p aria-hidden className="min-h-[10rem] whitespace-pre-wrap text-[clamp(20px,2.6vw,27px)] leading-snug text-white">
              {shown}
              {!done && <span className="lq-blink">▌</span>}
            </p>
            {!done && <p className="font-pixel mt-3 text-[8px] text-[#a98bff]">CLICK OR PRESS ENTER TO REVEAL EVERYTHING</p>}

            {secret && done && photos.length > 0 && (
              <ul className="lq-pop mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((p) => (
                  <li key={p} className="border-4 border-[#ffe94d] bg-[#140a2e] p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt={`Photo of ${config.girlfriend.name} and ${config.boyfriend.name}`} className="aspect-square w-full object-cover" onError={(e) => ((e.currentTarget.closest("li") as HTMLElement | null)?.style.setProperty("display", "none"))} />
                  </li>
                ))}
              </ul>
            )}

            {done && (
              <div className="lq-pop mt-5 flex flex-wrap items-center gap-3">
                {!secret && (
                  <button type="button" className="px-btn px-btn-mint" onClick={() => setSurprise(true)} autoFocus>
                    {s.buttonLabel.toUpperCase()}
                  </button>
                )}
                {!secret && hasSecret && (
                  <button type="button" className="px-btn" onClick={onSecret}>
                    ★ SECRET ENDING
                  </button>
                )}
                <button type="button" className="px-btn px-btn-alt" onClick={onTrophies}>
                  TROPHY ROOM
                </button>
                <button type="button" className="px-btn px-btn-alt" onClick={onMenu} autoFocus={secret}>
                  MAIN MENU
                </button>
                {!secret && !hasSecret && (
                  <p className="w-full text-[clamp(17px,2vw,21px)] text-[#a98bff]">
                    Psst... find all {config.secretEndingRequiredHearts} secret hearts for a bonus ending ({save.secretHearts.length}/{config.secretEndingRequiredHearts} found).
                  </p>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {surprise && (
        <Modal title={fmt(s.title, vars)} onEscape={() => setSurprise(false)} initialFocus="[data-close]">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={s.title} className="mb-4 max-h-[50vh] w-full border-4 border-[#ffe94d] object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
          <p className="text-[clamp(20px,2.6vw,27px)] leading-snug text-white">{fmt(s.message, vars)}</p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="px-btn px-btn-mint inline-block no-underline">
                OPEN LINK ↗
              </a>
            )}
            <button data-close type="button" className="px-btn" onClick={() => setSurprise(false)}>
              CLOSE
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
