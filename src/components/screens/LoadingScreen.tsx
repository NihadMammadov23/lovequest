"use client";

import { useEffect, useState } from "react";

const TIPS = [
  "Hold jump for a higher leap. Tap for a little hop.",
  "Gold hearts are secret. Find all five for a bonus ending.",
  "Telegraphed attacks glow before they land. Watch for the warning!",
  "Combos multiply your score. Don't miss!",
  "Ice cream is always the right answer.",
  "Medals: bronze, silver and gold. Can you get them all?",
];

export default function LoadingScreen({ progress }: { progress: number }) {
  const [tip, setTip] = useState(TIPS[0]);
  useEffect(() => setTip(TIPS[Math.floor(Math.random() * TIPS.length)]), []);
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-[#140a2e] p-6 text-center" role="status" aria-live="polite">
      <h1 className="px-title text-xl sm:text-3xl">LOVE QUEST</h1>
      <div className="px-progress w-full max-w-sm" role="progressbar" aria-label="Loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <p className="font-pixel text-[10px] text-[#d9ccff]">LOADING...</p>
      <p className="max-w-md text-[clamp(18px,2.4vw,24px)] text-[#a98bff]">{tip}</p>
    </main>
  );
}
