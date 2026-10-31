"use client";

import type { GameConfig } from "@/config/gameConfig";
import { CharacterCanvas, ScenicBackground } from "../ui/pixelArt";
import type { Equipped } from "@/lib/types";

interface Props {
  config: GameConfig;
  equipped: Equipped;
  hasSave: boolean;
  onStart: () => void;
  onContinue: () => void;
  onTrophies: () => void;
  onSettings: () => void;
}

export default function MainMenu({ config, equipped, hasSave, onStart, onContinue, onTrophies, onSettings }: Props) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-between overflow-hidden px-4 py-6 text-center">
      <ScenicBackground />
      <div className="mt-[4vh] flex flex-col items-center gap-3">
        <h1 className="px-title text-[clamp(28px,8vw,76px)] leading-tight">{config.gameTitle}</h1>
        <p className="font-pixel text-[clamp(8px,1.8vw,16px)] leading-relaxed text-[#ffd2a8] px-text">{config.subtitle.toUpperCase()}</p>
      </div>

      <nav aria-label="Main menu" className="z-10 my-4 grid w-full max-w-xs gap-4">
        {hasSave ? (
          <>
            <button type="button" className="px-btn" onClick={onContinue} autoFocus>
              CONTINUE
            </button>
            <button type="button" className="px-btn px-btn-alt" onClick={onStart}>
              NEW GAME
            </button>
          </>
        ) : (
          <button type="button" className="px-btn" onClick={onStart} autoFocus>
            START GAME
          </button>
        )}
        <button type="button" className="px-btn px-btn-alt" onClick={onTrophies}>
          TROPHY ROOM
        </button>
        <button type="button" className="px-btn px-btn-alt" onClick={onSettings}>
          SETTINGS
        </button>
      </nav>

      <div className="relative flex w-full max-w-xl items-end justify-center gap-[8vw]" aria-hidden>
        <div className="lq-bob">
          <CharacterCanvas who="girl" look={config.girlfriend.look} cosmetics={equipped} scale={5} pose="win" frame={0} label={config.girlfriend.name} />
        </div>
        <div className="lq-bob" style={{ animationDelay: "-0.8s" }}>
          <CharacterCanvas who="boy" look={config.boyfriend.look} beard={config.boyfriend.beard} wristband={config.boyfriend.wristband} scale={5} pose="win" frame={0} label={config.boyfriend.name} />
        </div>
      </div>
      <p className="px-text z-10 mt-3 text-[clamp(18px,2.4vw,24px)] text-[#d9ccff]">
        Made with love for {config.girlfriend.name} · since {config.anniversary.display}
      </p>
    </main>
  );
}
