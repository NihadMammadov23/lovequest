"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getConfig } from "@/config/validate";
import { GameBus, type CardsPayload, type DialoguePayload, type HudState, type QuizPayload } from "@/game/bus";
import { InputManager } from "@/game/input";
import { getAchievement } from "@/lib/achievements";
import { audio, type MusicName } from "@/lib/audio";
import type { CosmeticSlot } from "@/lib/cosmetics";
import {
  addSecretHeart,
  allLevelsCompleted,
  applyLevelResult,
  applyMiniGameResult,
  clearSave,
  equipCosmetic,
  freshSave,
  hasProgress,
  level3Score,
  loadSave,
  updateSettings,
  writeSave,
  type ApplyOutcome,
} from "@/lib/save";
import { medalFor } from "@/lib/scoring";
import {
  LEVEL_NAMES,
  MINI_GAME_IDS,
  type LevelId,
  type LevelResult,
  type Medal,
  type MiniGameId,
  type MiniGameResult,
  type SaveData,
  type SecretHeartId,
  type Settings,
} from "@/lib/types";
import PhaserHost from "./PhaserHost";
import CardsOverlay from "./play/CardsOverlay";
import DialogueOverlay from "./play/DialogueOverlay";
import Hud from "./play/Hud";
import PauseMenu from "./play/PauseMenu";
import QuizOverlay from "./play/QuizOverlay";
import Toasts, { type ToastItem } from "./play/Toasts";
import TouchControls, { useTouchDevice, type ControlLayout } from "./play/TouchControls";
import TranslatorGame from "./play/TranslatorGame";
import CharacterIntro from "./screens/CharacterIntro";
import EndingScreen from "./screens/EndingScreen";
import IntroScreen from "./screens/IntroScreen";
import Level3Hub from "./screens/Level3Hub";
import LevelSelect from "./screens/LevelSelect";
import LoadingScreen from "./screens/LoadingScreen";
import MainMenu from "./screens/MainMenu";
import ResultsScreen from "./screens/ResultsScreen";
import ScreenShell from "./screens/ScreenShell";
import SettingsScreen from "./screens/SettingsScreen";
import TrophyRoom from "./screens/TrophyRoom";
import ConfirmDialog from "./ui/ConfirmDialog";
import Modal from "./ui/Modal";
import { PixelIcon } from "./ui/pixelArt";

type View = "loading" | "menu" | "intro" | "characters" | "levels" | "hub3" | "play" | "results" | "trophies" | "settings" | "ending" | "secret";

interface Session {
  id: number;
  level: LevelId;
  mini?: MiniGameId;
  /** Phaser scene, or "Translator" for the HTML mini-game. */
  scene: string;
  bus: GameBus;
  input: InputManager;
  controls: ControlLayout | null;
}

interface Outcome {
  result: LevelResult;
  outcome: ApplyOutcome;
  medal: Medal;
}

interface MiniPanel {
  game: MiniGameId;
  result: MiniGameResult;
  best: number;
  newBest: boolean;
}

const MINI_NAMES: Record<MiniGameId, string> = { snack: "Snack Attack", hearts: "Heart Catcher", translator: "Boyfriend Translator" };

function sceneFor(level: LevelId, mini?: MiniGameId): string {
  if (level === 1) return "Level1";
  if (level === 2) return "Maze";
  if (level === 4) return "Boss";
  return mini === "snack" ? "Snack" : mini === "hearts" ? "Hearts" : "Translator";
}

function controlsFor(scene: string): ControlLayout | null {
  switch (scene) {
    case "Level1":
      return "platformer";
    case "Maze":
      return "topdown";
    case "Boss":
      return "boss";
    case "Snack":
    case "Hearts":
      return "catcher";
    default:
      return null;
  }
}

function musicFor(view: View, session: Session | null): MusicName | null {
  if (view === "ending" || view === "secret") return "ending";
  if (view === "play" && session) {
    switch (session.scene) {
      case "Level1":
        return "level";
      case "Maze":
        return "maze";
      case "Boss":
        return "boss";
      default:
        return "arcade";
    }
  }
  return "menu";
}

export default function GameApp() {
  const config = useMemo(() => getConfig(), []);
  const [save, setSave] = useState<SaveData | null>(null);
  const saveRef = useRef<SaveData | null>(null);
  const [view, setView] = useState<View>("loading");
  const [progress, setProgress] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const prevView = useRef<View>("menu");
  const nextId = useRef(1);
  const touch = useTouchDevice();

  // Overlay state while playing
  const [hud, setHud] = useState<HudState | null>(null);
  const [dialogue, setDialogue] = useState<DialoguePayload | null>(null);
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [cards, setCards] = useState<CardsPayload | null>(null);
  const [paused, setPaused] = useState(false);
  const [defeat, setDefeat] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [miniPanel, setMiniPanel] = useState<MiniPanel | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(1);
  const [confirmNew, setConfirmNew] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const l3Collected = useRef<Partial<Record<MiniGameId, number>>>({});
  const [endingKey, setEndingKey] = useState(0);
  const [hintDismissed, setHintDismissed] = useState(false);

  const endingCtx = useMemo(() => ({ bus: new GameBus(), input: new InputManager() }), [endingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----------------------------------------------------------------- saving

  const commit = useCallback((next: SaveData) => {
    saveRef.current = next;
    setSave(next);
    writeSave(next);
  }, []);

  const pushToast = useCallback((text: string) => {
    const id = toastId.current++;
    setToasts((t) => [...t, { id, text }].slice(-3));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const announce = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      audio.sfx("achievement");
      ids.forEach((id) => pushToast(`Achievement: ${getAchievement(id)?.name ?? id}`));
    },
    [pushToast],
  );

  // ---------------------------------------------------------------- loading

  useEffect(() => {
    let cancelled = false;
    const t0 = performance.now();
    const tick = window.setInterval(() => setProgress((p) => Math.min(0.9, p + 0.06)), 80);
    const fonts = typeof document !== "undefined" && "fonts" in document ? Promise.all([document.fonts.load('16px "Press Start 2P"'), document.fonts.load('22px "VT323"')]).catch(() => undefined) : Promise.resolve();
    fonts.then(() => {
      const loaded = loadSave();
      const wait = Math.max(0, 900 - (performance.now() - t0));
      window.setTimeout(() => {
        if (cancelled) return;
        window.clearInterval(tick);
        setProgress(1);
        saveRef.current = loaded;
        setSave(loaded);
        audio.configure(loaded.settings);
        window.setTimeout(() => !cancelled && setView("menu"), 150);
      }, wait);
    });
    return () => {
      cancelled = true;
      window.clearInterval(tick);
    };
  }, []);

  // Browsers only allow audio after a gesture.
  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (save) audio.configure(save.settings);
  }, [save]);

  useEffect(() => {
    if (view === "loading") return;
    audio.playMusic(musicFor(view, session));
  }, [view, session]);

  // ---------------------------------------------------------------- session

  const overlayOpen = !!(dialogue || quiz || cards || paused || defeat || miniPanel);

  useEffect(() => {
    sessionRef.current = session;
    // When a session ends (or is replaced) drop its event handlers so nothing can fire into stale state.
    return () => session?.bus.clear();
  }, [session]);

  // The game only receives the keyboard while no HTML overlay is in front of it.
  useEffect(() => {
    session?.input.setEnabled(!overlayOpen);
  }, [session, overlayOpen]);

  const resetOverlays = useCallback(() => {
    setHud(null);
    setDialogue(null);
    setQuiz(null);
    setCards(null);
    setPaused(false);
    setDefeat(null);
    setMiniPanel(null);
    setReady(false);
  }, []);

  const handleSecret = useCallback(
    (id: SecretHeartId) => {
      const s = saveRef.current;
      if (!s) return;
      const res = addSecretHeart(s, id);
      if (res.save === s) return;
      commit(res.save);
      pushToast(`Secret heart found! ${res.save.secretHearts.length}/5`);
      announce(res.newAchievements);
    },
    [commit, pushToast, announce],
  );

  const handleMini = useCallback(
    (result: MiniGameResult, showPanel: boolean) => {
      const s = saveRef.current;
      if (!s) return;
      const prevBest = s.miniScores[result.game];
      const res = applyMiniGameResult(s, result);
      commit(res.save);
      l3Collected.current[result.game] = Math.max(l3Collected.current[result.game] ?? 0, result.collectibles);
      announce(res.newAchievements);
      if (showPanel) {
        audio.sfx("win");
        setMiniPanel({ game: result.game, result, best: res.save.miniScores[result.game] ?? result.score, newBest: prevBest === undefined || result.score > prevBest });
      }
    },
    [commit, announce],
  );

  const handleLevelComplete = useCallback(
    (result: LevelResult) => {
      const s = saveRef.current;
      if (!s) return;
      const res = applyLevelResult(s, result);
      commit(res.save);
      setOutcome({ result, outcome: res, medal: medalFor(result.level, result.score) });
      audio.sfx(res.newAchievements.length ? "achievement" : "win");
      setSession(null);
      resetOverlays();
      setView("results");
    },
    [commit, resetOverlays],
  );

  const startPlay = useCallback(
    (level: LevelId, mini?: MiniGameId) => {
      if (level === 3 && !mini) {
        setSession(null);
        resetOverlays();
        setView("hub3");
        return;
      }
      const scene = sceneFor(level, mini);
      const bus = new GameBus();
      const input = new InputManager();
      const id = nextId.current++;

      bus.on("hud", setHud);
      bus.on("dialogue", (d) => {
        input.reset();
        setDialogue(d);
      });
      bus.on("quiz", (q) => {
        input.reset();
        setQuiz(q);
      });
      bus.on("cards", (c) => {
        input.reset();
        setCards(c);
      });
      bus.on("toast", (t) => pushToast(t.text));
      bus.on("secretHeart", (e) => handleSecret(e.id));
      bus.on("levelComplete", handleLevelComplete);
      bus.on("miniGameComplete", (r) => handleMini(r, true));
      bus.on("defeat", (d) => setDefeat(d.reason));
      bus.on("ready", () => setReady(true));
      // Switching tabs/windows pauses so nothing hits you while you are away.
      input.onFocusLost = () => {
        if (sessionRef.current?.id === id) {
          setPaused((p) => {
            if (!p) bus.emit("pause");
            return true;
          });
        }
      };

      resetOverlays();
      setOutcome(null);
      setSession({ id, level, mini, scene, bus, input, controls: controlsFor(scene) });
      setReady(scene === "Translator");
      setView("play");
    },
    [handleLevelComplete, handleMini, handleSecret, pushToast, resetOverlays],
  );

  const leavePlay = useCallback(
    (to: View) => {
      setSession(null);
      resetOverlays();
      setView(to);
    },
    [resetOverlays],
  );

  // ----------------------------------------------------------------- pause

  const pause = useCallback(() => {
    const s = sessionRef.current;
    if (!s || s.scene === "Translator" || overlayOpen) return;
    setPaused(true);
    s.bus.emit("pause");
  }, [overlayOpen]);

  const resume = useCallback(() => {
    const s = sessionRef.current;
    setPaused(false);
    s?.input.reset();
    s?.bus.emit("resume");
  }, []);

  const restart = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    setDialogue(null);
    setQuiz(null);
    setCards(null);
    setPaused(false);
    setDefeat(null);
    setMiniPanel(null);
    setHud(null);
    s.bus.emit("restart");
  }, []);

  useEffect(() => {
    if (view !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.repeat) return;
      if (paused) resume();
      else pause();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, paused, pause, resume]);

  // -------------------------------------------------------------- navigation

  const go = useCallback(
    (to: View) => {
      prevView.current = view;
      setView(to);
    },
    [view],
  );

  const startNewGame = useCallback(() => {
    const s = saveRef.current;
    if (!s) return;
    clearSave();
    commit(freshSave(s, config.girlfriend.defaultCosmetics));
    l3Collected.current = {};
    setConfirmNew(false);
    setView("intro");
  }, [commit, config]);

  const onStart = () => {
    const s = saveRef.current;
    if (s && hasProgress(s)) setConfirmNew(true);
    else setView(s?.flags.seenIntro ? "characters" : "intro");
  };

  const finishIntro = () => {
    const s = saveRef.current;
    if (s && !s.flags.seenIntro) commit({ ...s, flags: { ...s.flags, seenIntro: true } });
    setView("characters");
  };

  const openEnding = (secret: boolean) => {
    const s = saveRef.current;
    if (s) {
      const flags = secret ? { ...s.flags, secretEndingSeen: true } : { ...s.flags, endingSeen: true };
      if (flags.endingSeen !== s.flags.endingSeen || flags.secretEndingSeen !== s.flags.secretEndingSeen) commit({ ...s, flags });
    }
    setEndingKey((k) => k + 1);
    setView(secret ? "secret" : "ending");
  };

  const finishLevel3 = () => {
    const s = saveRef.current;
    if (!s) return;
    const collectibles = MINI_GAME_IDS.reduce((sum, g) => sum + (l3Collected.current[g] ?? 0), 0);
    const result: LevelResult = {
      level: 3,
      score: level3Score(s),
      timeSec: 0,
      collectibles,
      perfect: false,
      secretHearts: [],
      detail: { snack: s.miniScores.snack ?? 0, hearts: s.miniScores.hearts ?? 0, translator: s.miniScores.translator ?? 0 },
    };
    handleLevelComplete(result);
  };

  const playRandomMini = () => {
    const pool = MINI_GAME_IDS.filter((g) => !saveRef.current?.miniScores[g]);
    const from = pool.length ? pool : MINI_GAME_IDS;
    startPlay(3, from[Math.floor(Math.random() * from.length)]);
  };

  const settingsChange = (partial: Partial<Settings>) => {
    const s = saveRef.current;
    if (s) commit(updateSettings(s, partial));
  };

  // ----------------------------------------------------------------- render

  if (!save || view === "loading") return <LoadingScreen progress={progress} />;

  const hasSave = hasProgress(save);

  const confirmDialog = confirmNew && (
    <ConfirmDialog
      title="START A NEW GAME?"
      message={hasSave ? "This erases your levels, scores, medals, secret hearts and cosmetics. Your sound settings are kept. This cannot be undone." : "Start from the beginning?"}
      confirmLabel="ERASE & START"
      cancelLabel="KEEP MY PROGRESS"
      danger
      onConfirm={startNewGame}
      onCancel={() => setConfirmNew(false)}
    />
  );

  switch (view) {
    case "menu":
      return (
        <>
          <MainMenu config={config} equipped={save.equipped} hasSave={hasSave} onStart={onStart} onContinue={() => setView("levels")} onTrophies={() => go("trophies")} onSettings={() => go("settings")} />
          {confirmDialog}
        </>
      );
    case "intro":
      return <IntroScreen config={config} onDone={finishIntro} />;
    case "characters":
      return <CharacterIntro config={config} equipped={save.equipped} onContinue={() => setView("levels")} onBack={() => setView("menu")} />;
    case "levels":
      return (
        <LevelSelect
          config={config}
          save={save}
          onPlay={(l) => startPlay(l)}
          onTrophies={() => go("trophies")}
          onSettings={() => go("settings")}
          onMenu={() => setView("menu")}
          onEnding={() => openEnding(false)}
        />
      );
    case "hub3":
      return <Level3Hub save={save} onPlay={(g) => startPlay(3, g)} onRandom={playRandomMini} onFinish={finishLevel3} onBack={() => setView("levels")} />;
    case "trophies":
      return <TrophyRoom config={config} save={save} onEquip={(slot: CosmeticSlot, id: string) => commit(equipCosmetic(save, slot, id))} onBack={() => setView(prevView.current === "levels" ? "levels" : "menu")} />;
    case "settings":
      return (
        <>
          <SettingsScreen settings={save.settings} onChange={settingsChange} onBack={() => setView(prevView.current === "levels" ? "levels" : "menu")} onNewGame={() => setConfirmNew(true)} />
          {confirmDialog}
        </>
      );
    case "results":
      if (!outcome) return null;
      return (
        <ResultsScreen
          result={outcome.result}
          outcome={outcome.outcome}
          medal={outcome.medal}
          isFinal={outcome.result.level === 4}
          onNext={() => (outcome.result.level === 4 ? openEnding(false) : startPlay((outcome.result.level + 1) as LevelId))}
          onReplay={() => startPlay(outcome.result.level)}
          onLevels={() => setView("levels")}
        />
      );
    case "ending":
    case "secret":
      return (
        <EndingScreen
          key={endingKey}
          config={config}
          save={save}
          bus={endingCtx.bus}
          input={endingCtx.input}
          secret={view === "secret"}
          onMenu={() => setView("menu")}
          onTrophies={() => go("trophies")}
          onSecret={() => openEnding(true)}
          onLevels={() => setView("levels")}
        />
      );
    case "play":
      break;
    default:
      return null;
  }

  // ------------------------------------------------------------------- play

  if (!session) return null;
  const isPhaser = session.scene !== "Translator";
  const levelTitle = session.mini ? MINI_NAMES[session.mini] : LEVEL_NAMES[session.level];
  const portrait = typeof window !== "undefined" && window.innerHeight > window.innerWidth;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a041c]">
      {isPhaser ? (
        <>
          {touch && portrait && !hintDismissed && (
            <button type="button" className="font-pixel absolute top-2 z-30 max-w-[92vw] border-2 border-[#ffe94d] bg-[#2a0f5c] px-3 py-2 text-center text-[8px] leading-relaxed text-white" onClick={() => setHintDismissed(true)}>
              TIP: ROTATE YOUR PHONE FOR A BIGGER GAME (TAP TO HIDE)
            </button>
          )}
          <div className="lq-stage" data-testid="stage">
            <PhaserHost key={session.id} scene={session.scene} config={config} equipped={save.equipped} bus={session.bus} input={session.input} />
            {!ready && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-[#140a2e]" role="status">
                <p className="font-pixel text-[clamp(9px,2cqw,16px)] text-white">LOADING...</p>
                <div className="px-progress w-1/3">
                  <div className="lq-blink" style={{ width: "60%" }} />
                </div>
              </div>
            )}
            <Hud hud={hud} onPause={paused ? resume : pause} paused={paused} />
            <Toasts items={toasts} />
            <span className="sr-only-lq" aria-live="polite">
              {levelTitle}
            </span>

            {dialogue && (
              <DialogueOverlay
                dialogue={dialogue}
                onClose={() => {
                  setDialogue(null);
                  session.input.reset();
                  session.bus.emit("dialogueClosed");
                }}
              />
            )}
            {quiz && (
              <QuizOverlay
                quiz={quiz}
                onDone={(r) => {
                  setQuiz(null);
                  session.input.reset();
                  session.bus.emit("quizResult", { station: quiz.station, ...r });
                }}
              />
            )}
            {cards && (
              <CardsOverlay
                cards={cards}
                onDone={(r) => {
                  setCards(null);
                  session.input.reset();
                  session.bus.emit("cardsResult", { station: cards.station, ...r });
                }}
              />
            )}
            {paused && !dialogue && !quiz && !cards && (
              <PauseMenu
                settings={save.settings}
                onSettings={settingsChange}
                onResume={resume}
                onRestart={restart}
                onQuit={() => leavePlay(session.level === 3 ? "hub3" : "levels")}
              />
            )}
            {defeat && (
              <Modal title="DEFEATED!" inStage initialFocus="[data-first]">
                <p className="mb-5 text-[clamp(19px,2.6cqw,26px)] leading-snug text-white">{defeat}</p>
                <div className="flex flex-wrap justify-end gap-3">
                  <button type="button" className="px-btn px-btn-alt" onClick={() => leavePlay("levels")}>
                    LEVELS
                  </button>
                  <button data-first type="button" className="px-btn" onClick={restart}>
                    TRY AGAIN
                  </button>
                </div>
              </Modal>
            )}
            {miniPanel && (
              <Modal title={`${MINI_NAMES[miniPanel.game]} - results`} inStage initialFocus="[data-first]">
                <div className="text-center">
                  <p className="font-pixel text-[clamp(18px,4cqw,34px)] text-[#ffe94d]">{miniPanel.result.score}</p>
                  <p className="mt-2 text-[clamp(19px,2.4cqw,24px)] text-[#d9ccff]">
                    Best {miniPanel.best}
                    {miniPanel.newBest ? " · NEW BEST!" : ""}
                  </p>
                  {miniPanel.result.secretHearts.length > 0 && (
                    <p className="mt-2 flex items-center justify-center gap-2 text-[clamp(18px,2.2cqw,22px)] text-[#7dffcf]">
                      <PixelIcon name="heartMint" size={18} /> You caught the secret heart!
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button data-first type="button" className="px-btn" onClick={restart}>
                      PLAY AGAIN
                    </button>
                    <button type="button" className="px-btn px-btn-alt" onClick={() => leavePlay("hub3")}>
                      BACK TO HUB
                    </button>
                  </div>
                </div>
              </Modal>
            )}
          </div>
          {touch && session.controls && !overlayOpen && ready && <TouchControls input={session.input} layout={session.controls} />}
        </>
      ) : (
        <ScreenShell title="BOYFRIEND TRANSLATOR" onBack={() => leavePlay("hub3")} backLabel="HUB">
          <TranslatorGame key={session.id} config={config} onRecord={(r) => handleMini(r, false)} onQuit={() => leavePlay("hub3")} />
          <div className="mt-3 flex justify-center">
            <Toasts items={toasts} />
          </div>
        </ScreenShell>
      )}
    </main>
  );
}

void allLevelsCompleted;
