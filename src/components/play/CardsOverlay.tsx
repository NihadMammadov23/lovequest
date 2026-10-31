"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CardsPayload } from "@/game/bus";
import { audio } from "@/lib/audio";
import { shuffle } from "@/lib/text";
import Modal from "../ui/Modal";
import { PixelIcon, type IconName } from "../ui/pixelArt";

const FACES: { icon: IconName; name: string }[] = [
  { icon: "heart", name: "heart" },
  { icon: "icecream", name: "ice cream" },
  { icon: "donut", name: "donut" },
  { icon: "cookie", name: "cookie" },
  { icon: "cupcake", name: "cupcake" },
  { icon: "key", name: "key" },
  { icon: "moon", name: "moon" },
  { icon: "flower", name: "flower" },
  { icon: "gift", name: "gift" },
  { icon: "cat", name: "cat" },
];

interface Card {
  id: number;
  face: number;
  state: "down" | "up" | "done";
}

function deal(pairs: number): Card[] {
  const faces = shuffle(FACES.map((_, i) => i)).slice(0, pairs);
  return shuffle(faces.flatMap((f) => [f, f])).map((face, id) => ({ id, face, state: "down" as const }));
}

interface Props {
  cards: CardsPayload;
  onDone: (res: { mistakes: number; secondsLeft: number; solved: boolean }) => void;
}

export default function CardsOverlay({ cards: cfg, onDone }: Props) {
  const [deck, setDeck] = useState<Card[]>(() => deal(cfg.pairs));
  const [mistakes, setMistakes] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(cfg.seconds);
  const [status, setStatus] = useState<"playing" | "won" | "timeup">("playing");
  const [started, setStarted] = useState(false);
  const lock = useRef(false);
  const flipped = useRef<number[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Countdown starts with the first flip so reading the rules is not penalised.
  useEffect(() => {
    if (!started || status !== "playing") return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setStatus("timeup");
          audio.sfx("wrong");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, status]);

  const flip = useCallback(
    (id: number) => {
      if (lock.current || status !== "playing") return;
      const card = deck.find((c) => c.id === id);
      if (!card || card.state !== "down") return;
      setStarted(true);
      audio.sfx("click");
      flipped.current = [...flipped.current, id];
      setDeck((d) => d.map((c) => (c.id === id ? { ...c, state: "up" } : c)));
      if (flipped.current.length === 2) {
        lock.current = true;
        const [a, b] = flipped.current;
        const ca = deck.find((c) => c.id === a)!;
        const cb = id === b ? card : deck.find((c) => c.id === b)!;
        const match = ca.face === cb.face;
        const t = window.setTimeout(() => {
          flipped.current = [];
          lock.current = false;
          if (match) {
            audio.sfx("correct");
            setDeck((d) => {
              const next = d.map((c) => (c.id === a || c.id === b ? { ...c, state: "done" as const } : c));
              if (next.every((c) => c.state === "done")) setStatus("won");
              return next;
            });
          } else {
            audio.sfx("wrong");
            setMistakes((m) => m + 1);
            setDeck((d) => d.map((c) => (c.id === a || c.id === b ? { ...c, state: "down" as const } : c)));
          }
        }, match ? 350 : 800);
        timers.current.push(t);
      }
    },
    [deck, status],
  );

  const retry = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    flipped.current = [];
    lock.current = false;
    setDeck(deal(cfg.pairs));
    setSecondsLeft(cfg.seconds);
    setStarted(false);
    setStatus("playing");
  };

  const cols = cfg.pairs * 2 <= 12 ? 4 : 6;
  const urgent = secondsLeft <= 10 && status === "playing";

  return (
    <Modal title={cfg.title} inStage wide>
      <div className="mb-3 flex items-center justify-between font-pixel text-[10px]">
        <span className={urgent ? "text-[#ff8a7a]" : "text-[#d9ccff]"} aria-live="off">
          TIME {secondsLeft}s
        </span>
        <span className="text-[#d9ccff]">MISTAKES {mistakes}</span>
      </div>
      <p className="mb-3 text-[clamp(17px,2.2cqw,22px)] text-[#d9ccff]">Match every pair before the timer runs out. The clock starts with your first flip.</p>

      <div className="mx-auto grid max-w-[min(28rem,40cqw)] gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="group" aria-label="Memory cards">
        {deck.map((c, i) => {
          const open = c.state !== "down";
          const face = FACES[c.face];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => flip(c.id)}
              disabled={c.state === "done" || status !== "playing"}
              aria-label={open ? `Card ${i + 1}: ${face.name}${c.state === "done" ? ", matched" : ""}` : `Card ${i + 1}, face down`}
              className={`px-card flex aspect-square items-center justify-center p-1 ${c.state === "done" ? "!border-[#7dffcf] opacity-70" : ""} ${open ? "!bg-[#3b1d86]" : ""}`}
            >
              <PixelIcon name={open ? face.icon : "cardBack"} size={open ? 34 : 38} />
            </button>
          );
        })}
      </div>

      <div className="mt-4 min-h-[3rem]" aria-live="polite">
        {status === "won" && (
          <div className="lq-pop flex flex-wrap items-center justify-between gap-3">
            <p className="text-[clamp(18px,2.4cqw,24px)] text-[#b8ffe6]">All pairs matched with {secondsLeft}s to spare! Here is your key.</p>
            <button type="button" className="px-btn px-btn-mint" onClick={() => onDone({ mistakes, secondsLeft, solved: true })} autoFocus>
              TAKE THE KEY
            </button>
          </div>
        )}
        {status === "timeup" && (
          <div className="lq-pop flex flex-wrap items-center justify-between gap-3">
            <p className="text-[clamp(18px,2.4cqw,24px)] text-[#ffc7bf]">Time is up! The cards shuffle themselves. Try again.</p>
            <button type="button" className="px-btn" onClick={retry} autoFocus>
              TRY AGAIN
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
