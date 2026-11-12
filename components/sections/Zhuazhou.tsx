"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useInView, useReducedMotion } from "framer-motion";
import type { SectionProps, ZhuazhouSection } from "@/lib/types";
import { SECTION_TITLES, ZHUAZHOU } from "@/lib/copy";
import { logEvent } from "@/lib/events";
import { playPick, playReveal } from "@/lib/sfx";
import { useStoryUi } from "@/components/StoryContext";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ImageResultModal } from "@/components/ui/ImageResultModal";
import { ZhuazhouIcon } from "@/components/zhuazhou";

const ITEM_SIZE = 80;
const SLOT_COLUMNS = [84, 160, 236];
const SLOT_ROWS = [80, 200];

/** 两排三列落在红布之内，避免 150° 小弧上六件互相遮挡（DEV_SPEC 6.4.1 的弧线改为错落双排） */
function arcPosition(index: number, _count: number): { left: number; top: number } {
  const row = index < 3 ? 0 : 1;
  const column = index % 3;
  return {
    left: SLOT_COLUMNS[column] - ITEM_SIZE / 2,
    top: SLOT_ROWS[row] - ITEM_SIZE / 2,
  };
}

function cssVar(styles: CSSStyleDeclaration, name: string): string {
  const value = styles.getPropertyValue(name).trim();
  if (!value) throw new Error(name);
  return value;
}

/** 结果卡右下角的方印：边缘不规则做旧（DEV_SPEC 6.4.3） */
function ResultSeal() {
  return (
    <svg className="zz__seal" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M3.4 4.6 44.4 3.4 44.8 44.2 3.7 44.7Z" fill="#B23A2E" />
      <path className="zz__seal-chip" d="M44.4 3.4 44.6 14.2 38.8 13.4 39.2 3.9Z" opacity="0.9" />
      <path className="zz__seal-chip" d="M3.7 39.2 9.8 39.8 9.4 44.7 3.7 44.7Z" opacity="0.75" />
      <path className="zz__seal-chip" d="M20.5 3.7 21 7.6 17.2 7.8 17 4.1Z" opacity="0.6" />
      {Array.from(ZHUAZHOU.seal).map((char, index) => (
        <text key={`${char}-${index}`} x="24" y={index === 0 ? 20 : 35} textAnchor="middle" fontSize="13">
          {char}
        </text>
      ))}
    </svg>
  );
}

export default function Zhuazhou({ data, total }: SectionProps<ZhuazhouSection>) {
  const ui = useStoryUi();
  const reduced = useReducedMotion() ?? false;
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const posterUrlRef = useRef<string | null>(null);
  const inView = useInView(sceneRef, { once: true, margin: "-80px" });

  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [posterPending, setPosterPending] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const meta = SECTION_TITLES.zhuazhou;
  const current = data.items.find((item) => item.key === selected);

  useEffect(() => {
    posterUrlRef.current = posterUrl;
    return () => {
      if (posterUrl) URL.revokeObjectURL(posterUrl);
    };
  }, [posterUrl]);

  // 点击后 320ms 展开结果卡（DEV_SPEC 6.4.1）
  useEffect(() => {
    if (!selected) {
      setRevealed(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setRevealed(true);
      playReveal();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [selected]);

  const reset = useCallback(() => {
    const key = selected;
    setSelected(null);
    setRevealed(false);
    setPosterPending(false);
    setError("");
    if (key) itemRefs.current.get(key)?.focus({ preventScroll: true });
  }, [selected]);

  const closePoster = useCallback(() => {
    setPosterUrl(null);
  }, []);

  // 结果卡打开时锁滚动，Esc 关闭（海报打开时先关海报，避免滚动锁互相覆盖）
  useEffect(() => {
    if (!revealed) return;
    cardRef.current?.scrollIntoView({ block: "center" });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (posterUrlRef.current) setPosterUrl(null);
      else reset();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [revealed, reset]);

  const pick = (key: string) => {
    if (selected) return;
    setSelected(key);
    setHovered(null);
    setError("");
    playPick();
    navigator.vibrate?.(8);
  };

  const makePoster = async () => {
    if (!current || posterPending) return;
    setPosterPending(true);
    setError("");
    const canvas = document.createElement("canvas");
    const root = document.querySelector<HTMLElement>("[data-theme]");
    const styles = window.getComputedStyle(root ?? document.documentElement);
    try {
      const { drawZhuazhouPoster } = await import("@/lib/poster");
      drawZhuazhouPoster(canvas, {
        label: current.label,
        fortune: current.fortune,
        meaning: current.meaning,
        name: ui.hero?.name ?? "",
        accent: cssVar(styles, "--c-accent"),
        ink: cssVar(styles, "--c-ink"),
        background: cssVar(styles, "--c-bg"),
      });
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });
      if (!blob) {
        setError(ZHUAZHOU.saveFailed);
        return;
      }
      setPosterUrl(URL.createObjectURL(blob));
      void logEvent({ slug: ui.slug, type: "poster_save", payload: { kind: "zhuazhou" } });
    } catch {
      setError(ZHUAZHOU.saveFailed);
    } finally {
      setPosterPending(false);
    }
  };

  return (
    <div>
      <SectionTitle
        index={meta.index}
        title={meta.title}
        subtitle={meta.subtitle}
        total={total}
        headingId="heading-zhuazhou"
      />
      <p className="mt-4 text-center text-xs text-ink-3">{ZHUAZHOU.hint}</p>

      <m.div
        ref={sceneRef}
        className="zz__scene"
        role="group"
        aria-label={ZHUAZHOU.sceneAria}
      >
        <span className="zz__glow" aria-hidden="true" />
        <span className="zz__cloth" aria-hidden="true" />
        <div className="zz__arc">
          {data.items.map((item, index) => {
            const active = selected === item.key;
            const dimmed = selected !== null && !active;
            const position = arcPosition(index, data.items.length);

            return (
              <m.div
                key={item.key}
                className="zz__slot"
                style={{ left: position.left, top: position.top }}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : -12 }}
                transition={
                  reduced
                    ? { duration: 0.2 }
                    : { type: "spring", stiffness: 260, damping: 18, delay: index * 0.08 }
                }
              >
                <m.button
                  type="button"
                  ref={(node) => {
                    if (node) itemRefs.current.set(item.key, node);
                    else itemRefs.current.delete(item.key);
                  }}
                  className="zz__item"
                  data-hovered={hovered === item.key}
                  aria-label={ZHUAZHOU.itemAria(item.label)}
                  aria-pressed={active}
                  onClick={() => pick(item.key)}
                  onHoverStart={() => setHovered(item.key)}
                  onHoverEnd={() => setHovered((value) => (value === item.key ? null : value))}
                  animate={{
                    opacity: dimmed ? 0.18 : hovered && !active ? 0.8 : 1,
                    y: reduced ? 0 : dimmed ? 4 : 0,
                    scale: active && !reduced ? 1.14 : 1,
                    rotate: active && !reduced ? [-4, 0] : 0,
                  }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  whileHover={!selected && !reduced ? { y: -6, scale: 1.06 } : undefined}
                  whileTap={!selected && !reduced ? { scale: 1.1 } : undefined}
                >
                  <ZhuazhouIcon itemKey={item.key} className="zz__icon" />
                  <span className="zz__label">{item.label}</span>
                  {active && !reduced ? (
                    <m.span
                      className="zz__ripple"
                      aria-hidden="true"
                      initial={{ opacity: 0.7, scale: 0.55 }}
                      animate={{ opacity: 0, scale: 2.4 }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  ) : null}
                </m.button>
              </m.div>
            );
          })}
        </div>
      </m.div>

      <AnimatePresence>
        {revealed && current ? (
          <m.div
            key="result"
            ref={cardRef}
            className="zz__result"
            role="status"
            aria-live="polite"
            aria-label={ZHUAZHOU.resultAria(current.fortune)}
            tabIndex={-1}
            initial={{ opacity: 0, y: reduced ? 0 : 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : 12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <ZhuazhouIcon itemKey={current.key} className="zz__result-icon" />
            <p className="zz__fortune">{current.fortune}</p>
            <p className="zz__meaning">{current.meaning}</p>
            <div className="zz__actions">
              <button type="button" className="btn-outline" onClick={reset}>
                {ZHUAZHOU.again}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => void makePoster()}
                disabled={posterPending}
              >
                {posterPending ? ZHUAZHOU.saving : ZHUAZHOU.save}
              </button>
            </div>
            {error ? <p className="zz__result-error">{error}</p> : null}
            <ResultSeal />
          </m.div>
        ) : null}
      </AnimatePresence>

      {posterUrl ? (
        <ImageResultModal
          src={posterUrl}
          alt={current?.fortune ?? ""}
          hint={ZHUAZHOU.save}
          onClose={closePoster}
        />
      ) : null}
    </div>
  );
}
