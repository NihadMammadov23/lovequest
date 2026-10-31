"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** Reveals text character by character. `finish()` shows everything immediately. */
export function useTypewriter(text: string, opts: { cps?: number; start?: boolean } = {}) {
  const { cps = 34, start = true } = opts;
  const reduced = usePrefersReducedMotion();
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setCount(0);
    if (!start) return;
    if (reduced) {
      doneRef.current = true;
      setCount(text.length);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      if (doneRef.current) {
        window.clearInterval(id);
        return;
      }
      // Reveal in small batches so very long letters still finish in a reasonable time.
      i = Math.min(text.length, i + 1);
      setCount(i);
      if (i >= text.length) {
        doneRef.current = true;
        window.clearInterval(id);
      }
    }, 1000 / cps);
    return () => window.clearInterval(id);
  }, [text, start, reduced, cps]);

  const finish = useCallback(() => {
    doneRef.current = true;
    setCount(text.length);
  }, [text]);

  return { shown: text.slice(0, count), done: count >= text.length, finish };
}
