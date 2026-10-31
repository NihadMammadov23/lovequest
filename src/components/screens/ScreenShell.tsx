"use client";

import type { ReactNode } from "react";
import { ScenicBackground } from "../ui/pixelArt";

interface Props {
  title?: string;
  children: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
  wide?: boolean;
  dim?: boolean;
}

/** Common frame for the menu-style screens: scenic background, scrollable content, optional back button. */
export default function ScreenShell({ title, children, onBack, backLabel = "BACK", right, wide = false, dim = true }: Props) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col">
      <ScenicBackground dim={dim} />
      <header className="flex items-center justify-between gap-3 p-3 sm:p-5">
        {onBack ? (
          <button type="button" className="px-btn px-btn-alt px-btn-sm" onClick={onBack}>
            ◀ {backLabel}
          </button>
        ) : (
          <span />
        )}
        {right}
      </header>
      <div className={`mx-auto w-full flex-1 px-3 pb-8 sm:px-5 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
        {title && <h1 className="px-title mb-5 text-center text-lg leading-relaxed sm:text-2xl">{title}</h1>}
        {children}
      </div>
    </main>
  );
}
