"use client";

import Modal from "./Modal";

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = "YES", cancelLabel = "CANCEL", danger = false, onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} onEscape={onCancel} initialFocus="[data-cancel]">
      <p className="mb-5 text-[clamp(19px,2.4vw,24px)] leading-snug text-[#e9e0ff]">{message}</p>
      <div className="flex flex-wrap justify-end gap-3">
        <button data-cancel type="button" className="px-btn px-btn-alt" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={`px-btn ${danger ? "" : "px-btn-mint"}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
