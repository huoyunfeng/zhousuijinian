"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { POSTER } from "@/lib/copy";

interface ImageResultModalProps {
  src: string;
  alt: string;
  hint: string;
  onClose: () => void;
}

export function ImageResultModal({ src, alt, hint, onClose }: ImageResultModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
        <img src={src} alt={alt} className="max-h-[78vh] w-auto max-w-full rounded-md shadow-lift" />
        <p className="text-xs text-white/85">{hint}</p>
      </div>
      <button
        type="button"
        className="absolute right-4 top-4 h-10 w-10 rounded-full bg-surface/80 text-ink"
        onClick={onClose}
        aria-label={POSTER.close}
      >
        ✕
      </button>
    </div>,
    document.body,
  );
}
