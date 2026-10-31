"use client";

import { useEffect, useState } from "react";
import type { Action, InputManager } from "@/game/input";

export type ControlLayout = "platformer" | "topdown" | "catcher" | "boss";

export function useTouchDevice(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setTouch(mq.matches || "ontouchstart" in window || navigator.maxTouchPoints > 0);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return touch;
}

function HoldButton({ input, action, label, aria, className = "" }: { input: InputManager; action: Action; label: string; aria: string; className?: string }) {
  const [down, setDown] = useState(false);
  const set = (v: boolean) => {
    setDown(v);
    input.setTouch(action, v);
  };
  // Release if the component unmounts while held (e.g. the level ends)
  useEffect(() => () => input.setTouch(action, false), [input, action]);
  return (
    <button
      type="button"
      aria-label={aria}
      data-down={down}
      className={`lq-touch-btn ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span aria-hidden>{label}</span>
    </button>
  );
}

/** On-screen controls for touch devices. Holding a button holds the matching action. */
export default function TouchControls({ input, layout }: { input: InputManager; layout: ControlLayout }) {
  const move =
    layout === "topdown" ? (
      <div className="grid grid-cols-3 grid-rows-3 gap-1" style={{ width: "fit-content" }}>
        <span />
        <HoldButton input={input} action="up" label="▲" aria="Move up" />
        <span />
        <HoldButton input={input} action="left" label="◀" aria="Move left" />
        <span />
        <HoldButton input={input} action="right" label="▶" aria="Move right" />
        <span />
        <HoldButton input={input} action="down" label="▼" aria="Move down" />
        <span />
      </div>
    ) : (
      <div className="flex gap-3">
        <HoldButton input={input} action="left" label="◀" aria="Move left" />
        <HoldButton input={input} action="right" label="▶" aria="Move right" />
      </div>
    );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end justify-between p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" aria-label="On-screen controls">
      <div className="pointer-events-auto">{move}</div>
      <div className="pointer-events-auto flex gap-3">
        {layout === "boss" && <HoldButton input={input} action="action" label="B" aria="Throw ice cream" />}
        {(layout === "platformer" || layout === "boss") && <HoldButton input={input} action="jump" label="A" aria="Jump" />}
      </div>
    </div>
  );
}
