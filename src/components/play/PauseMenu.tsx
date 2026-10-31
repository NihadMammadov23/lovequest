"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";
import Modal from "../ui/Modal";
import HowToPlay from "./HowToPlay";
import SoundControls from "../ui/SoundControls";

interface Props {
  settings: Settings;
  onSettings: (s: Partial<Settings>) => void;
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export default function PauseMenu({ settings, onSettings, onResume, onRestart, onQuit }: Props) {
  const [view, setView] = useState<"main" | "help">("main");
  return (
    <Modal title={view === "main" ? "PAUSED" : "HOW TO PLAY"} inStage onEscape={view === "help" ? () => setView("main") : onResume} initialFocus="[data-first]">
      {view === "main" ? (
        <div className="grid gap-3">
          <button data-first type="button" className="px-btn" onClick={onResume}>
            RESUME
          </button>
          <button type="button" className="px-btn px-btn-alt" onClick={onRestart}>
            RESTART LEVEL
          </button>
          <button type="button" className="px-btn px-btn-alt" onClick={() => setView("help")}>
            HOW TO PLAY
          </button>
          <SoundControls settings={settings} onChange={onSettings} compact />
          <button type="button" className="px-btn px-btn-alt" onClick={onQuit}>
            QUIT TO MENU
          </button>
        </div>
      ) : (
        <>
          <HowToPlay />
          <div className="mt-4 flex justify-end">
            <button data-first type="button" className="px-btn" onClick={() => setView("main")}>
              BACK
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
