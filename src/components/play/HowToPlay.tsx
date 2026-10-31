"use client";

import { useTouchDevice } from "./TouchControls";

const ROWS: { key: string; what: string }[] = [
  { key: "← → / A D", what: "Move" },
  { key: "Space / ↑ / W", what: "Jump (hold for higher)" },
  { key: "J / K / E / Shift", what: "Throw ice cream (boss fight)" },
  { key: "↑ ↓ ← → / WASD", what: "Walk around the maze" },
  { key: "Esc", what: "Pause" },
];

export default function HowToPlay() {
  const touch = useTouchDevice();
  return (
    <div className="space-y-4 text-[clamp(18px,2.2vw,24px)] leading-snug text-[#e9e0ff]">
      <ul className="grid gap-1">
        <li>
          <b className="text-[#ffe94d]">1. The First Meet:</b> run, jump, collect all 15 hearts and reach the arch. Stomp clouds, avoid spikes. You have 3 hearts of health and checkpoints.
        </li>
        <li>
          <b className="text-[#ffe94d]">2. The Memory Maze:</b> solve three puzzle stations to earn keys that open the doors.
        </li>
        <li>
          <b className="text-[#ffe94d]">3. Girlfriend vs. Chaos:</b> three arcade mini-games. Play each one to finish the level.
        </li>
        <li>
          <b className="text-[#ffe94d]">4. The Boss Fight:</b> dodge the telegraphed attacks and throw ice cream to win.
        </li>
        <li>
          <b className="text-[#7dffcf]">Secret hearts:</b> five shiny gold hearts are hidden around the game. Find them all for a bonus ending.
        </li>
      </ul>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only-lq">Keyboard controls</caption>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.key} className="border-b-2 border-[#3a1a80]">
              <th scope="row" className="font-pixel whitespace-nowrap py-1.5 pr-3 text-[9px] font-normal text-[#ffc2d6]">
                {r.key}
              </th>
              <td className="py-1.5">{r.what}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {touch && <p className="text-[#a98bff]">On a phone? Use the on-screen buttons. Landscape mode gives you a bigger game.</p>}
    </div>
  );
}
