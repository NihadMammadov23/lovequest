"use client";

import { useId } from "react";
import type { Settings } from "@/lib/types";

interface Props {
  settings: Settings;
  onChange: (s: Partial<Settings>) => void;
  compact?: boolean;
}

export default function SoundControls({ settings, onChange, compact = false }: Props) {
  const id = useId();
  return (
    <div className={`grid gap-3 ${compact ? "" : "sm:gap-4"}`}>
      <button type="button" className="px-btn px-btn-alt" role="switch" aria-checked={!settings.muted} onClick={() => onChange({ muted: !settings.muted })}>
        SOUND: {settings.muted ? "OFF" : "ON"}
      </button>
      <label htmlFor={`${id}-m`} className="grid gap-1 text-[clamp(18px,2.2vw,22px)]">
        <span className="font-pixel text-[9px] text-[#d9ccff]">MUSIC {Math.round(settings.music * 100)}%</span>
        <input id={`${id}-m`} type="range" min={0} max={100} step={5} value={Math.round(settings.music * 100)} onChange={(e) => onChange({ music: Number(e.target.value) / 100 })} className="h-6 w-full accent-[#ff5c8a]" />
      </label>
      <label htmlFor={`${id}-s`} className="grid gap-1 text-[clamp(18px,2.2vw,22px)]">
        <span className="font-pixel text-[9px] text-[#d9ccff]">EFFECTS {Math.round(settings.sfx * 100)}%</span>
        <input id={`${id}-s`} type="range" min={0} max={100} step={5} value={Math.round(settings.sfx * 100)} onChange={(e) => onChange({ sfx: Number(e.target.value) / 100 })} className="h-6 w-full accent-[#ff5c8a]" />
      </label>
    </div>
  );
}
