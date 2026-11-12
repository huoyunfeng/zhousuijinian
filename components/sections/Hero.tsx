"use client";

import { useEffect, useRef, useState } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "framer-motion";
import type { HeroSection, SectionProps } from "@/lib/types";
import { HERO, SECTION_ANCHORS } from "@/lib/copy";
import { anniversaryDate, dottedDate } from "@/lib/date";
import { useStoryUi } from "@/components/StoryContext";
import { SmartImage } from "@/components/ui/SmartImage";
import { WaxSeal } from "@/components/ui/WaxSeal";

export default function Hero({ data }: SectionProps<HeroSection>) {
  const ui = useStoryUi();
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [desktop, setDesktop] = useState(false);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const parallax = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0.4]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const age = ui.hero?.ageText ?? "";
  const year = anniversaryDate(data.birthday, 1).slice(0, 4);
  const animateImage = desktop && !reduce;
  const sealChar = (ui.hero?.name ?? data.name).slice(0, 1);

  return (
    <section id={SECTION_ANCHORS.hero} ref={ref} className="hero">
      <div className="hero__media photo-frame">
        <m.div className="absolute inset-0" style={animateImage ? { y: parallax, scale: 1.03 } : undefined}>
          <SmartImage
            photo={data.cover}
            fill
            priority
            sizes="100vw"
            imgClassName="!object-cover"
            style={{ backgroundPosition: "center" }}
          />
        </m.div>
        <div className="hero__veil" />
        <div className="hero__sweep" aria-hidden="true" />
      </div>
      <WaxSeal char={sealChar} size={56} className="hero__seal" />
      <m.div className="hero__inner" style={animateImage ? { opacity: fade } : undefined}>
        <m.p
          className="eyebrow !text-white/75"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {HERO.eyebrow(Number(year))}
        </m.p>
        <m.h1
          className="hero__name mt-3"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          {data.name}
        </m.h1>
        <m.p
          className="hero__tagline"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.32 }}
        >
          {data.tagline}
        </m.p>
        {data.showAge ? (
          <m.p
            className="hero__meta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {HERO.meta(dottedDate(data.birthday), age)}
          </m.p>
        ) : null}
        <m.a
          href={`#${SECTION_ANCHORS.timeline12}`}
          className="hero__scroll"
          aria-label={HERO.scrollLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M10 3v12M5 11l5 5 5-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </m.a>
      </m.div>
    </section>
  );
}
