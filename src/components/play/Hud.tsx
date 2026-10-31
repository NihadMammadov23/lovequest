"use client";

import type { HudState } from "@/game/bus";
import { formatTime } from "@/lib/text";
import { PixelIcon } from "../ui/pixelArt";

interface Props {
  hud: HudState | null;
  onPause: () => void;
  paused: boolean;
}

export default function Hud({ hud, onPause, paused }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-[1.5cqw] pt-[1.2cqw]">
      <div className="flex items-start justify-between gap-[1cqw]">
        <div className="flex flex-col gap-[0.8cqw]">
          {hud && hud.maxHp > 0 && (
            <div className="flex gap-[0.6cqw]" role="img" aria-label={`Health ${hud.hp} of ${hud.maxHp}`}>
              {Array.from({ length: hud.maxHp }, (_, i) => (
                <PixelIcon key={i} name={i < hud.hp ? "heart" : "heartEmpty"} size={28} />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-[0.6cqw]">
            {hud?.chips.map((c) => (
              <span key={c.label} className="lq-hud-chip">
                {c.label} <span className="text-white">{c.value}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-[1cqw]">
          <div className="text-right">
            <div className="lq-hud-text">SCORE {String(hud?.score ?? 0).padStart(5, "0")}</div>
            <div className="lq-hud-text mt-[0.4cqw] text-[#d9ccff]">TIME {formatTime(hud?.timeSec ?? 0)}</div>
          </div>
          <button type="button" className="px-icon-btn pointer-events-auto" onClick={onPause} aria-label={paused ? "Resume game" : "Pause game"} aria-pressed={paused}>
            <span className="font-pixel text-[10px]" aria-hidden>
              II
            </span>
          </button>
        </div>
      </div>

      {hud?.boss && (
        <div className="absolute left-1/2 top-[1.2cqw] w-[42%] -translate-x-1/2">
          <div className="lq-hud-text mb-[0.4cqw] flex justify-between">
            <span>{hud.boss.name.toUpperCase()}</span>
            <span className="text-[#ffc2d6]">{hud.boss.phase.toUpperCase()}</span>
          </div>
          <div className="h-[2cqw] border-[3px] border-[#a98bff] bg-[#140a2e]" role="progressbar" aria-label="Boss health" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hud.boss.ratio * 100)}>
            <div className="h-full bg-[repeating-linear-gradient(90deg,#ff5c8a_0_6px,#ff8fb8_6px_12px)] transition-[width] duration-200" style={{ width: `${Math.round(hud.boss.ratio * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
