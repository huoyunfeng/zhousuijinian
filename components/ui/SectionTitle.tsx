"use client";

import { m, useReducedMotion, type Variants } from "framer-motion";

interface SectionTitleProps {
  index: string;
  title: string;
  subtitle?: string;
  total: number;
  headingId: string;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const character: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export function SectionTitle({ index, title, subtitle, total, headingId }: SectionTitleProps) {
  const reduce = useReducedMotion();

  return (
    <header className="text-center">
      {index ? (
        <p className="eyebrow">
          {index} / {String(total).padStart(2, "0")}
        </p>
      ) : null}
      <m.h2
        id={headingId}
        className="section-title mt-3"
        aria-label={title}
        initial={reduce ? false : "hidden"}
        whileInView={reduce ? undefined : "show"}
        viewport={{ once: true, margin: "-40px" }}
        variants={container}
      >
        {reduce
          ? title
          : Array.from(title).map((value, position) => (
              <m.span
                key={`${value}-${position}`}
                className="section-title__char"
                aria-hidden="true"
                variants={character}
              >
                {value === " " ? "\u00A0" : value}
              </m.span>
            ))}
      </m.h2>
      {subtitle ? <p className="mt-2 text-sm text-ink-2">{subtitle}</p> : null}
      <div className="hairline mt-6" />
    </header>
  );
}
