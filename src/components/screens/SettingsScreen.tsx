"use client";

import type { Settings } from "@/lib/types";
import HowToPlay from "../play/HowToPlay";
import SoundControls from "../ui/SoundControls";
import ScreenShell from "./ScreenShell";

interface Props {
  settings: Settings;
  onChange: (s: Partial<Settings>) => void;
  onBack: () => void;
  onNewGame: () => void;
}

export default function SettingsScreen({ settings, onChange, onBack, onNewGame }: Props) {
  return (
    <ScreenShell title="SETTINGS" onBack={onBack}>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="px-panel p-4" aria-labelledby="snd">
          <h2 id="snd" className="font-pixel mb-4 text-[11px] text-[#ffc2d6]">
            SOUND
          </h2>
          <SoundControls settings={settings} onChange={onChange} />
          <h2 className="font-pixel mt-6 mb-3 text-[11px] text-[#ffc2d6]">PROGRESS</h2>
          <button type="button" className="px-btn px-btn-alt w-full" onClick={onNewGame}>
            NEW GAME
          </button>
          <p className="mt-2 text-[clamp(17px,2vw,21px)] text-[#a98bff]">Starts again from level 1. You will be asked to confirm first.</p>
        </section>
        <section className="px-panel p-4" aria-labelledby="how">
          <h2 id="how" className="font-pixel mb-3 text-[11px] text-[#ffc2d6]">
            HOW TO PLAY
          </h2>
          <HowToPlay />
        </section>
      </div>
    </ScreenShell>
  );
}
