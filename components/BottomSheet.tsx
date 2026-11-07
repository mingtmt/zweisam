"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Slides up from the bottom on phones, centered dialog on wider screens. */
export default function BottomSheet({ title, onClose, children, footer }: BottomSheetProps) {
  const { t } = useI18n();
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 motion-safe:animate-fade-in sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl bg-card shadow-xl motion-safe:animate-sheet-up sm:rounded-3xl"
      >
        <div
          className="flex shrink-0 touch-none flex-col items-center px-5 pb-2 pt-2.5"
          onTouchStart={(e) => (startY.current = e.touches[0].clientY)}
          onTouchMove={(e) => {
            if (startY.current === null) return;
            setDragY(Math.max(0, e.touches[0].clientY - startY.current));
          }}
          onTouchEnd={() => {
            if (dragY > 90) onClose();
            setDragY(0);
            startY.current = null;
          }}
        >
          <span className="mb-2 h-1.5 w-10 rounded-full bg-line sm:hidden" />
          <div className="flex w-full items-center justify-between">
            <h2 className="text-lg font-extrabold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-soft"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
