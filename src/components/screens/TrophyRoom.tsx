"use client";

import type { GameConfig } from "@/config/gameConfig";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { COSMETIC_SLOTS, getCosmeticUnlockName, itemsForSlot, type CosmeticSlot } from "@/lib/cosmetics";
import { level3Score, medalCounts, totalCollectibles, totalScore } from "@/lib/save";
import { fmt } from "@/lib/text";
import { LEVEL_IDS, LEVEL_NAMES, SECRET_HEART_IDS, type SaveData, type SecretHeartId } from "@/lib/types";
import { CharacterCanvas, PixelIcon } from "../ui/pixelArt";
import { medalIcon } from "./LevelSelect";
import ScreenShell from "./ScreenShell";

/** Each secret heart reveals one of the configured memories. */
export const HEART_MEMORY: Record<SecretHeartId, number> = { l1a: 0, l1b: 1, l2: 2, l4: 3, l3: 4 };
const HEART_WHERE: Record<SecretHeartId, string> = {
  l1a: "Level 1, high above the clouds",
  l1b: "Level 1, down in the pit near the end",
  l2: "Level 2, at the end of the longest dead end",
  l3: "Level 3, falling in Heart Catcher",
  l4: "Level 4, on the highest cloud",
};

const SLOT_LABEL: Record<CosmeticSlot, string> = { hat: "HAT", eyewear: "GLASSES", earrings: "EARRINGS", cape: "CAPE" };

interface Props {
  config: GameConfig;
  save: SaveData;
  onEquip: (slot: CosmeticSlot, id: string) => void;
  onBack: () => void;
}

export default function TrophyRoom({ config, save, onEquip, onBack }: Props) {
  const vars = { girlfriend: config.girlfriend.name, boyfriend: config.boyfriend.name, anniversary: config.anniversary.display };
  const medals = medalCounts(save);
  return (
    <ScreenShell title="TROPHY ROOM" onBack={onBack} wide>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {/* Wardrobe */}
        <section className="px-panel p-4" aria-labelledby="wardrobe">
          <h2 id="wardrobe" className="font-pixel mb-3 text-[11px] text-[#ffc2d6]">
            {config.girlfriend.name.toUpperCase()}&apos;S WARDROBE
          </h2>
          <div className="mb-3 flex justify-center bg-[#2a1260] p-3">
            <CharacterCanvas who="girl" look={config.girlfriend.look} cosmetics={save.equipped} scale={7} pose="win" label={`${config.girlfriend.name} wearing the selected cosmetics`} />
          </div>
          {COSMETIC_SLOTS.map((slot) => (
            <fieldset key={slot} className="mb-3">
              <legend className="font-pixel mb-1 text-[9px] text-[#a98bff]">{SLOT_LABEL[slot]}</legend>
              <div className="flex flex-wrap gap-2">
                {itemsForSlot(slot).map((item) => {
                  const unlocked = save.cosmeticsUnlocked.includes(`${slot}:${item.id}`);
                  const equipped = save.equipped[slot] === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!unlocked}
                      aria-pressed={equipped}
                      onClick={() => onEquip(slot, item.id)}
                      className={`px-btn px-btn-sm ${equipped ? "px-btn-mint" : "px-btn-alt"}`}
                      title={unlocked ? item.name : `Unlock with: ${getCosmeticUnlockName(item)}`}
                    >
                      {unlocked ? item.name : `🔒 ${getCosmeticUnlockName(item)}`}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </section>

        <div className="grid content-start gap-5">
          {/* Medals */}
          <section className="px-panel p-4" aria-labelledby="medals">
            <h2 id="medals" className="font-pixel mb-3 text-[11px] text-[#ffc2d6]">
              MEDALS & HIGH SCORES
            </h2>
            <ul className="grid gap-2">
              {LEVEL_IDS.map((id) => (
                <li key={id} className="flex items-center gap-3 border-b-2 border-[#3a1a80] pb-2">
                  <PixelIcon name={medalIcon(save.medals[id])} size={30} alt={save.medals[id] ? `${save.medals[id]} medal` : "no medal"} />
                  <span className="flex-1 text-[clamp(18px,2.1vw,22px)]">{LEVEL_NAMES[id]}</span>
                  <span className="font-pixel text-[10px] text-[#ffe94d]">{id === 3 ? Math.max(save.highScores[3], level3Score(save)) : save.highScores[id]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[clamp(18px,2.1vw,22px)] text-[#d9ccff]">
              Total <b className="text-[#ffe94d]">{totalScore(save)}</b> · {medals.gold} gold, {medals.silver} silver, {medals.bronze} bronze · {totalCollectibles(save)} collectibles
            </p>
          </section>

          {/* Secret hearts and memories */}
          <section className="px-panel p-4" aria-labelledby="secrets">
            <h2 id="secrets" className="font-pixel mb-3 text-[11px] text-[#ffe94d]">
              SECRET HEARTS {save.secretHearts.length}/{SECRET_HEART_IDS.length}
            </h2>
            <ul className="grid gap-2">
              {SECRET_HEART_IDS.map((id) => {
                const found = save.secretHearts.includes(id);
                const mem = config.memories[HEART_MEMORY[id] % config.memories.length];
                return (
                  <li key={id} className="flex items-start gap-3">
                    <PixelIcon name={found ? "heartGold" : "heartEmpty"} size={22} alt={found ? "found" : "not found"} />
                    <span className="text-[clamp(18px,2.1vw,22px)] leading-snug">
                      {found ? (
                        <>
                          <b className="text-[#ffe94d]">{fmt(mem.title, vars)}</b>
                          <br />
                          <span className="text-[#e9e0ff]">{fmt(mem.text, vars)}</span>
                        </>
                      ) : (
                        <span className="text-[#a98bff]">??? Hidden in {HEART_WHERE[id]}.</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Achievements */}
        <section className="px-panel p-4 lg:col-span-2" aria-labelledby="ach">
          <h2 id="ach" className="font-pixel mb-3 text-[11px] text-[#ffc2d6]">
            ACHIEVEMENTS {save.achievements.length}/{ACHIEVEMENTS.length}
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const got = save.achievements.includes(a.id);
              return (
                <li key={a.id} className={`flex items-start gap-3 border-2 p-2 ${got ? "border-[#ffe94d] bg-[#2a1260]" : "border-[#3a1a80] opacity-70"}`}>
                  <PixelIcon name={got ? "trophyGold" : "trophyNone"} size={26} alt={got ? "unlocked" : "locked"} />
                  <span className="text-[clamp(18px,2.1vw,22px)] leading-snug">
                    <b className={got ? "text-[#ffe94d]" : "text-[#d9ccff]"}>{a.name}</b>
                    <br />
                    <span className="text-[#d9ccff]">{a.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </ScreenShell>
  );
}
