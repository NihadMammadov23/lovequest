"use client";

import type { GameConfig } from "@/config/gameConfig";
import type { Equipped } from "@/lib/types";
import { fmt } from "@/lib/text";
import { CharacterCanvas } from "../ui/pixelArt";
import ScreenShell from "./ScreenShell";

export default function CharacterIntro({ config, equipped, onContinue, onBack }: { config: GameConfig; equipped: Equipped; onContinue: () => void; onBack: () => void }) {
  const vars = { girlfriend: config.girlfriend.name, boyfriend: config.boyfriend.name, anniversary: config.anniversary.display };
  return (
    <ScreenShell title="MEET THE CONTENDERS" onBack={onBack}>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="px-panel flex flex-col items-center p-5 text-center" aria-labelledby="player-1">
          <p className="font-pixel mb-2 text-[9px] text-[#ffc2d6]">PLAYER 1 · THE CHALLENGER</p>
          <h2 id="player-1" className="px-title mb-3 text-lg">
            {config.girlfriend.name.toUpperCase()}
          </h2>
          <div className="lq-bob my-2">
            <CharacterCanvas who="girl" look={config.girlfriend.look} cosmetics={equipped} scale={8} pose="win" label={config.girlfriend.name} />
          </div>
          <p className="text-[clamp(19px,2.4vw,24px)] leading-snug text-[#e9e0ff]">{fmt(config.girlfriend.description, vars)}</p>
          <p className="font-pixel mt-3 text-[8px] leading-relaxed text-[#7dffcf]">SPECIAL MOVE: ICE CREAM TOSS</p>
        </section>
        <section className="px-panel flex flex-col items-center p-5 text-center" aria-labelledby="player-2">
          <p className="font-pixel mb-2 text-[9px] text-[#ff8a7a]">THE FINAL BOSS</p>
          <h2 id="player-2" className="px-title mb-3 text-lg">
            {config.boyfriend.name.toUpperCase()}
          </h2>
          <div className="lq-bob my-2" style={{ animationDelay: "-0.6s" }}>
            <CharacterCanvas who="boy" look={config.boyfriend.look} beard={config.boyfriend.beard} wristband={config.boyfriend.wristband} scale={8} pose="win" label={config.boyfriend.name} />
          </div>
          <p className="text-[clamp(19px,2.4vw,24px)] leading-snug text-[#e9e0ff]">{fmt(config.boyfriend.description, vars)}</p>
          <p className="font-pixel mt-3 text-[8px] leading-relaxed text-[#ffd2a8]">MOODS: SLEEPY · HUNGRY · DRAMATIC</p>
        </section>
      </div>
      <div className="mt-6 flex justify-center">
        <button type="button" className="px-btn" onClick={onContinue} autoFocus>
          LET&apos;S PLAY ▶
        </button>
      </div>
    </ScreenShell>
  );
}
