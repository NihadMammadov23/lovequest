"use client";

import { allMiniGamesPlayed, level3Score } from "@/lib/save";
import { MINI_GAME_IDS, type MiniGameId, type SaveData } from "@/lib/types";
import { PixelIcon, type IconName } from "../ui/pixelArt";
import ScreenShell from "./ScreenShell";

const INFO: Record<MiniGameId, { name: string; blurb: string; icon: IconName }> = {
  snack: { name: "Snack Attack", blurb: "Catch the falling snacks. Dodge the broccoli and socks. It speeds up!", icon: "icecream" },
  hearts: { name: "Heart Catcher", blurb: "40 seconds. Catch hearts, chase combos and grab the gold ones.", icon: "heart" },
  translator: { name: "Boyfriend Translator", blurb: "Decode what he really means. Streaks earn bonus points.", icon: "cloud" },
};

interface Props {
  save: SaveData;
  onPlay: (g: MiniGameId) => void;
  onRandom: () => void;
  onFinish: () => void;
  onBack: () => void;
}

export default function Level3Hub({ save, onPlay, onRandom, onFinish, onBack }: Props) {
  const all = allMiniGamesPlayed(save);
  return (
    <ScreenShell title="GIRLFRIEND VS. CHAOS" onBack={onBack} backLabel="LEVELS">
      <p className="mb-4 text-center text-[clamp(19px,2.4vw,24px)] text-[#d9ccff]">Play all three mini-games to finish the level. Your best score in each counts.</p>
      <ul className="grid gap-4 md:grid-cols-3">
        {MINI_GAME_IDS.map((g) => {
          const best = save.miniScores[g];
          return (
            <li key={g}>
              <button type="button" className="px-card flex h-full w-full flex-col items-center gap-3 p-4 text-center" onClick={() => onPlay(g)}>
                <PixelIcon name={INFO[g].icon} size={g === "translator" ? 56 : 40} />
                <span className="font-pixel text-[11px] leading-relaxed text-white">{INFO[g].name.toUpperCase()}</span>
                <span className="text-[clamp(18px,2.1vw,22px)] leading-snug text-[#d9ccff]">{INFO[g].blurb}</span>
                <span className="font-pixel mt-auto text-[9px] text-[#7dffcf]">{best !== undefined ? `✓ BEST ${best}` : "NOT PLAYED"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="px-btn px-btn-alt" onClick={onRandom}>
          SURPRISE ME
        </button>
        <button type="button" className="px-btn px-btn-mint" disabled={!all} onClick={onFinish}>
          FINISH LEVEL 3 {all ? `(${level3Score(save)})` : ""}
        </button>
      </div>
      {!all && <p className="mt-3 text-center text-[clamp(18px,2.1vw,22px)] text-[#a98bff]">Play every mini-game at least once to finish the level.</p>}
    </ScreenShell>
  );
}
