"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LIGHTBOX } from "@/lib/copy";
import type { Photo } from "@/lib/types";
import { SmartImage } from "./SmartImage";

interface LightboxProps {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

/** 灯箱：点击遮罩/Esc 关闭，左右键切换，触屏滑动（DEV_SPEC 5.3） */
export default function Lightbox({ photos, index, onClose, onIndexChange }: LightboxProps) {
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus();
    };
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => {
      const next = (index + direction + photos.length) % photos.length;
      onIndexChange(next);
    },
    [index, onIndexChange, photos.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  if (!mounted) return null;
  const photo = photos[index];
  if (!photo) return null;

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={LIGHTBOX.ariaLabel}
      onClick={onClose}
      onTouchStart={(event) => {
        touchX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchX.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? 0) - touchX.current;
        if (Math.abs(delta) > 48) step(delta > 0 ? -1 : 1);
        touchX.current = null;
      }}
    >
      <div key={index} className="lightbox__figure lightbox__figure--turn" onClick={(event) => event.stopPropagation()}>
        <SmartImage photo={photo} fill fit="contain" sizes="100vw" priority />
      </div>

      <button
        ref={closeRef}
        type="button"
        className="absolute right-4 top-4 h-10 w-10 rounded-full bg-surface/80 text-ink"
        onClick={onClose}
        aria-label={LIGHTBOX.close}
      >
        ✕
      </button>

      <button
        type="button"
        className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-6 text-2xl text-white/80"
        onClick={(event) => {
          event.stopPropagation();
          step(-1);
        }}
        aria-label={LIGHTBOX.prev}
      >
        ‹
      </button>
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-6 text-2xl text-white/80"
        onClick={(event) => {
          event.stopPropagation();
          step(1);
        }}
        aria-label={LIGHTBOX.next}
      >
        ›
      </button>

      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-num text-xs text-white/80">
        {LIGHTBOX.counter(index + 1, photos.length)}
      </p>
    </div>,
    document.body,
  );
}
