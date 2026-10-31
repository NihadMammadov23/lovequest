"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title: string;
  children: ReactNode;
  /** Called on Escape. Omit to make the dialog un-dismissable by keyboard. */
  onEscape?: () => void;
  /** Positions inside the nearest positioned ancestor (the game stage) instead of the whole screen. */
  inStage?: boolean;
  wide?: boolean;
  hideTitle?: boolean;
  /** Selector inside the modal that should receive initial focus. */
  initialFocus?: string;
  className?: string;
}

/**
 * Accessible dialog: labelled, focus is moved in and trapped, focus returns to the previous element on close,
 * and keyboard events do not leak to the game underneath.
 */
export default function Modal({ title, children, onEscape, inStage = false, wide = false, hideTitle = false, initialFocus, className = "" }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    if (el) {
      const target = (initialFocus ? el.querySelector<HTMLElement>(initialFocus) : null) ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el;
      target.focus({ preventScroll: true });
    }
    return () => {
      if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape" && onEscape) {
      e.preventDefault();
      onEscape();
      return;
    }
    if (e.key === "Tab" && ref.current) {
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className={`${inStage ? "absolute" : "fixed"} inset-0 z-50 flex items-center justify-center bg-[#0a041c]/75 p-3 sm:p-6`}
      onKeyDown={onKeyDown}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`px-panel lq-pop max-h-full w-full overflow-y-auto p-4 outline-none sm:p-6 ${wide ? "max-w-3xl" : "max-w-xl"} ${className}`}
      >
        <h2 id={titleId} className={hideTitle ? "sr-only-lq" : "font-pixel mb-4 text-sm leading-relaxed text-[#ffe0ec] sm:text-base"}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
