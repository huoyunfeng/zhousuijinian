"use client";

import { useRef } from "react";
import { m, useScroll, useSpring } from "framer-motion";
import type { SectionProps, Timeline12Section } from "@/lib/types";
import { SECTION_ANCHORS, SECTION_TITLES, TIMELINE } from "@/lib/copy";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SmartImage } from "@/components/ui/SmartImage";

export default function Timeline12({ data, total }: SectionProps<Timeline12Section>) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 55%"] });
  const line = useSpring(scrollYProgress, { stiffness: 60, damping: 24, restDelta: 0.001 });
  const meta = SECTION_TITLES.timeline12;

  return (
    <div ref={ref}>
      <SectionTitle
        index={meta.index}
        title={meta.title}
        subtitle={meta.subtitle}
        total={total}
        headingId="heading-months"
      />
      <ol className="timeline" aria-labelledby="heading-months">
        <m.span
          aria-hidden="true"
          className="absolute bottom-0 left-[19px] top-0 w-px origin-top bg-accent md:left-1/2"
          style={{ scaleY: line }}
        />
        {data.items.map((item, index) => (
          <m.li
            key={item.month}
            className="timeline__item"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.04 }}
          >
            <span className="timeline__dot" aria-hidden="true">
              {TIMELINE.monthLabel(item.month)}
            </span>
            {item.placeholder ? (
              <div className="timeline__placeholder">{TIMELINE.placeholder}</div>
            ) : (
              <div className="timeline__photo photo-frame">
                <SmartImage photo={item.photo} sizes="(max-width: 768px) 80vw, 340px" />
              </div>
            )}
            {item.placeholder ? null : (
              <div className="timeline__text">
                <p className="timeline__note">{item.note}</p>
                {item.date ? <p className="timeline__date">{item.date}</p> : null}
              </div>
            )}
          </m.li>
        ))}
      </ol>
      <p className="sr-only">{SECTION_ANCHORS.timeline12}</p>
    </div>
  );
}
