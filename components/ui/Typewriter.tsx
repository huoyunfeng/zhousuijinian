"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { LETTER } from "@/lib/copy";

interface TypewriterProps {
  text: string;
  className?: string;
}

const PAUSE_CHARS = new Set(["，", "。", "！", "？", "、", "；", "：", "\n"]);

/** 打字机：进入视口开始，点击跳过，尊重 prefers-reduced-motion（DEV_SPEC 0.5 / 5.3） */
export function Typewriter({ text, className }: TypewriterProps) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setCount(text.length);
      setStarted(true);
      return;
    }
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduce, text]);

  useEffect(() => {
    if (!started || count >= text.length) return;
    const char = text[count];
    const delay = PAUSE_CHARS.has(char) ? 180 : 45;
    const timer = window.setTimeout(() => {
      setCount((current) => Math.min(text.length, current + 1));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [count, started, text]);

  const paragraphs = text.split("\n");
  let remaining = count;

  return (
    <div
      ref={ref}
      className={`cursor-pointer ${className ?? ""}`}
      onClick={() => setCount(text.length)}
      role="presentation"
      aria-label={LETTER.skip}
    >
      {paragraphs.map((paragraph, index) => {
        const slice = paragraph.slice(0, Math.max(0, remaining));
        remaining -= paragraph.length;
        if (remaining < 0) remaining = 0;
        return (
          <p key={index} aria-hidden={slice.length < paragraph.length}>
            {slice}
            {slice.length < paragraph.length ? <span className="typewriter__caret" /> : null}
          </p>
        );
      })}
    </div>
  );
}
