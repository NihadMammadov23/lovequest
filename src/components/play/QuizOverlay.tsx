"use client";

import { useEffect, useState } from "react";
import type { QuizPayload } from "@/game/bus";
import { audio } from "@/lib/audio";
import Modal from "../ui/Modal";

interface Props {
  quiz: QuizPayload;
  onDone: (res: { correct: number; mistakes: number }) => void;
}

type Feedback = { kind: "wrong" | "right"; text: string } | null;

/** Multiple-choice station. Wrong answers are marked and the player tries again, so every station can be finished. */
export default function QuizOverlay({ quiz, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrongSet, setWrongSet] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const q = quiz.questions[index];
  const answered = feedback?.kind === "right";
  const isLast = index === quiz.questions.length - 1;

  const choose = (i: number) => {
    if (answered || wrongSet.has(i)) return;
    if (i === q.correctIndex) {
      audio.sfx("correct");
      setFeedback({ kind: "right", text: q.correctReaction });
    } else {
      audio.sfx("wrong");
      setMistakes((m) => m + 1);
      setWrongSet((s) => new Set(s).add(i));
      setFeedback({ kind: "wrong", text: q.wrongReaction });
      setShakeKey((k) => k + 1);
    }
  };

  const next = () => {
    if (!answered) return;
    if (isLast) {
      onDone({ correct: quiz.questions.length, mistakes });
      return;
    }
    setIndex((n) => n + 1);
    setWrongSet(new Set());
    setFeedback(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= String(q.options.length)) choose(Number(e.key) - 1);
      else if ((e.key === "Enter" || e.key === " ") && answered && document.activeElement?.tagName !== "BUTTON") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, answered, wrongSet, mistakes]);

  return (
    <Modal title={quiz.title} inStage wide>
      <p className="font-pixel mb-2 text-[10px] text-[#a98bff]">
        QUESTION {index + 1} / {quiz.questions.length}
      </p>
      <p className="mb-4 text-[clamp(20px,3cqw,30px)] leading-snug text-white" aria-live="polite">
        {q.question}
      </p>
      <div className="grid gap-3" role="group" aria-label="Answers">
        {q.options.map((opt, i) => {
          const wrong = wrongSet.has(i);
          const right = answered && i === q.correctIndex;
          return (
            <button
              key={`${index}-${i}`}
              type="button"
              disabled={answered && !right}
              aria-disabled={wrong}
              onClick={() => choose(i)}
              className={`px-btn ${right ? "px-btn-mint" : wrong ? "px-btn-alt opacity-50" : "px-btn-alt"} ${wrong && shakeKey ? "lq-shake" : ""} text-left`}
            >
              <span className="mr-2 opacity-70">{i + 1}.</span>
              <span className="font-body text-[clamp(18px,2.4cqw,24px)] normal-case tracking-normal">{opt}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 min-h-[3.2rem]" aria-live="assertive">
        {feedback && (
          <p className={`lq-pop border-l-4 pl-3 text-[clamp(18px,2.4cqw,24px)] ${feedback.kind === "right" ? "border-[#7dffcf] text-[#b8ffe6]" : "border-[#ff8a7a] text-[#ffc7bf]"}`}>
            {feedback.text}
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-pixel text-[9px] text-[#a98bff]">MISTAKES {mistakes}</span>
        <button type="button" className="px-btn" disabled={!answered} onClick={next}>
          {isLast ? "TAKE THE KEY" : "NEXT"}
        </button>
      </div>
    </Modal>
  );
}
