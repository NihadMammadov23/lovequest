"use client";

export interface ToastItem {
  id: number;
  text: string;
}

export default function Toasts({ items }: { items: ToastItem[] }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[3cqw] z-30 flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="lq-slide-in font-pixel max-w-[80%] border-[3px] border-[#ffc2d6] bg-[#2a0f5c]/95 px-3 py-2 text-center text-[clamp(7px,1.4cqw,13px)] leading-relaxed text-white shadow-[0_0_0_3px_#140a2e]">
          {t.text}
        </div>
      ))}
    </div>
  );
}
