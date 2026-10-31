"use client";

import type { GameConfig } from "@/config/gameConfig";
import { allLevelsCompleted, isLevelUnlocked, level3Score, medalCounts, totalScore } from "@/lib/save";
import { LEVEL_IDS, LEVEL_NAMES, type LevelId, type Medal, type SaveData } from "@/lib/types";
import { PixelIcon, type IconName } from "../ui/pixelArt";
import ScreenShell from "./ScreenShell";

const BLURB: Record<LevelId, string> = {
  1: "Run, jump and collect 15 hearts on the way to the arch.",
  2: "Solve three puzzle stations to unlock the doors.",
  3: "Three arcade mini-games. Snacks, hearts and boyfriend-speak.",
  4: "Dodge, throw ice cream and defeat the cartoon boyfriend.",
};

export function medalIcon(m: Medal | null): IconName {
  return m === "gold" ? "trophyGold" : m === "silver" ? "trophySilver" : m === "bronze" ? "trophyBronze" : "trophyNone";
}

interface Props {
  config: GameConfig;
  save: SaveData;
  onPlay: (level: LevelId) => void;
  onTrophies: () => void;
  onSettings: () => void;
  onMenu: () => void;
  onEnding: () => void;
}

export default function LevelSelect({ config, save, onPlay, onTrophies, onSettings, onMenu, onEnding }: Props) {
  const medals = medalCounts(save);
  const done = allLevelsCompleted(save);
  return (
    <ScreenShell
      title="CHOOSE YOUR LEVEL"
      onBack={onMenu}
      backLabel="MENU"
      right={
        <div className="flex gap-2">
          <button type="button" className="px-btn px-btn-alt px-btn-sm" onClick={onTrophies}>
            TROPHIES
          </button>
          <button type="button" className="px-btn px-btn-alt px-btn-sm" onClick={onSettings}>
            SETTINGS
          </button>
        </div>
      }
    >
      <p className="mb-5 text-center text-[clamp(19px,2.4vw,24px)] text-[#d9ccff]" aria-live="polite">
        Total score <b className="text-[#ffe94d]">{totalScore(save)}</b> · medals{" "}
        <b className="text-[#ffe94d]">
          {medals.gold}G {medals.silver}S {medals.bronze}B
        </b>{" "}
        · secret hearts <b className="text-[#7dffcf]">{save.secretHearts.length}/5</b>
      </p>

      <ul className="grid gap-4 sm:grid-cols-2">
        {LEVEL_IDS.map((id) => {
          const unlocked = isLevelUnlocked(save, id);
          const score = id === 3 && save.completed[3] ? Math.max(save.highScores[3], level3Score(save)) : save.highScores[id];
          return (
            <li key={id}>
              <button type="button" disabled={!unlocked} onClick={() => onPlay(id)} className="px-card flex h-full w-full flex-col gap-2 p-4 text-left" aria-label={`Level ${id}: ${LEVEL_NAMES[id]}${unlocked ? "" : ", locked"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-pixel text-[9px] text-[#ffc2d6]">LEVEL {id}</p>
                    <h2 className="font-pixel mt-1 text-[11px] leading-relaxed text-white sm:text-xs">{LEVEL_NAMES[id].toUpperCase()}</h2>
                  </div>
                  {unlocked ? <PixelIcon name={medalIcon(save.medals[id])} size={36} alt={save.medals[id] ? `${save.medals[id]} medal` : "no medal yet"} /> : <PixelIcon name="lock" size={30} alt="locked" />}
                </div>
                <p className="text-[clamp(18px,2.2vw,22px)] leading-snug text-[#d9ccff]">{unlocked ? BLURB[id] : `Locked. Complete level ${id - 1} first.`}</p>
                <div className="mt-auto flex items-center justify-between pt-2 font-pixel text-[9px]">
                  <span className="text-[#a98bff]">{score > 0 ? `BEST ${score}` : unlocked ? "NOT PLAYED" : ""}</span>
                  {unlocked && <span className="text-[#7dffcf]">{save.completed[id] ? "REPLAY ▶" : "PLAY ▶"}</span>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {done && (
        <div className="lq-pop mt-6 flex flex-col items-center gap-2 text-center">
          <p className="text-[clamp(19px,2.4vw,24px)] text-[#ffe94d]">{config.girlfriend.name}, you completed every level!</p>
          <button type="button" className="px-btn px-btn-mint" onClick={onEnding}>
            {save.flags.endingSeen ? "WATCH THE ENDING AGAIN" : "SEE YOUR REWARD"}
          </button>
        </div>
      )}
    </ScreenShell>
  );
}
