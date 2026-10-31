"use client";

import type { DialoguePayload } from "@/game/bus";
import Modal from "../ui/Modal";
import { PixelIcon } from "../ui/pixelArt";

export default function DialogueOverlay({ dialogue, onClose }: { dialogue: DialoguePayload; onClose: () => void }) {
  return (
    <Modal title={dialogue.title} inStage onEscape={onClose} initialFocus="[data-close]">
      <div className="mb-3 flex items-center gap-2 text-[#ffe94d]">
        <PixelIcon name="heartGold" size={20} />
        <span className="font-pixel text-[10px]">SECRET HEART FOUND</span>
      </div>
      <p className="text-[clamp(18px,2.6cqw,26px)] leading-snug text-white">{dialogue.text}</p>
      <div className="mt-5 flex justify-end">
        <button data-close type="button" className="px-btn" onClick={onClose}>
          CONTINUE
        </button>
      </div>
    </Modal>
  );
}
