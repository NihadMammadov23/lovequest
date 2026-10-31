"use client";

import { useEffect } from "react";
import type { GameConfig } from "@/config/gameConfig";
import { fmt } from "@/lib/text";
import { useTypewriter } from "../ui/useTypewriter";
import { ScenicBackground } from "../ui/pixelArt";

export default function IntroScreen({ config, onDone }: { config: GameConfig; onDone: () => void }) {
  const text = fmt(config.introText, { girlfriend: config.girlfriend.name, boyfriend: config.boyfriend.name, anniversary: config.anniversary.display });
  const { shown, done, finish } = useTypewriter(text, { cps: 30 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (done) onDone();
        else finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, finish, onDone]);

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center p-4" onClick={() => (done ? onDone() : finish())}>
      <ScenicBackground dim />
      <div className="px-panel w-full max-w-2xl p-5 sm:p-8">
        <p className="font-pixel mb-4 text-[10px] text-[#ffc2d6]">THE ANNOUNCER</p>
        <p className="sr-only-lq">{text}</p>
        <p aria-hidden className="min-h-[9rem] text-[clamp(22px,3.2vw,34px)] leading-snug text-white">
          {shown}
          <span className="lq-blink">▌</span>
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="px-btn px-btn-alt px-btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              onDone();
            }}
          >
            SKIP
          </button>
          <button
            type="button"
            className="px-btn"
            autoFocus
            onClick={(e) => {
              e.stopPropagation();
              if (done) onDone();
              else finish();
            }}
          >
            {done ? "CONTINUE ▶" : "FASTER ▶▶"}
          </button>
        </div>
      </div>
    </main>
  );
}
