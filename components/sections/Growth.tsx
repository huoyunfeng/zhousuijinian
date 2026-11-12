"use client";

import { useEffect, useMemo, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import type { GrowthSection, SectionProps } from "@/lib/types";
import { GROWTH, SECTION_TITLES } from "@/lib/copy";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Stat, StaticStat } from "@/components/ui/Stat";

const WIDTH = 320;
const HEIGHT = 180;
const PAD = 26;

type Metric = "height" | "weight";

export default function Growth({ data, total }: SectionProps<GrowthSection>) {
  const [metric, setMetric] = useState<Metric>("height");
  const [selected, setSelected] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const meta = SECTION_TITLES.growth;

  const points = useMemo(() => [...data.points].sort((a, b) => a.month - b.month), [data.points]);
  const latest = points[points.length - 1];
  const unit = metric === "height" ? GROWTH.unit.height : GROWTH.unit.weight;
  const values = points.map((point) => (metric === "height" ? point.height : point.weight));

  const geometry = useMemo(() => {
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const low = min - span * 0.18;
    const high = max + span * 0.18;
    const x = (month: number) => PAD + (month / 12) * (WIDTH - PAD * 2);
    const y = (value: number) => HEIGHT - PAD - ((value - low) / (high - low)) * (HEIGHT - PAD * 2);
    const coords = points.map((point) => ({
      month: point.month,
      value: metric === "height" ? point.height : point.weight,
      cx: x(point.month),
      cy: y(metric === "height" ? point.height : point.weight),
    }));
    const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.cx},${point.cy}`).join(" ");
    const area = `${line} L${coords[coords.length - 1].cx},${HEIGHT - PAD} L${coords[0].cx},${HEIGHT - PAD} Z`;
    return { coords, line, area };
  }, [metric, points, values]);

  useEffect(() => {
    if (selected === null) return;
    const timer = window.setTimeout(() => setSelected(null), 3000);
    return () => window.clearTimeout(timer);
  }, [selected]);

  const activePoint = selected !== null ? geometry?.coords[selected] : undefined;

  return (
    <div>
      <SectionTitle index={meta.index} title={meta.title} subtitle={meta.subtitle} total={total} headingId="heading-growth" />

      {latest ? (
        <div className="growth__stats">
          <Stat label={GROWTH.height} value={latest.height} unit={GROWTH.unit.height} decimals={1} />
          <Stat label={GROWTH.weight} value={latest.weight} unit={GROWTH.unit.weight} decimals={1} />
          <StaticStat
            label={GROWTH.teeth}
            value={data.teeth !== undefined ? String(data.teeth) : "—"}
            unit={data.teeth !== undefined ? GROWTH.unit.teeth : undefined}
          />
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-ink-3">{GROWTH.empty}</p>
      )}

      {geometry ? (
        <div className="mt-6">
          <div className="flex justify-center gap-5">
            {(["height", "weight"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMetric(key);
                  setSelected(null);
                }}
                aria-pressed={metric === key}
                className={`relative pb-1 text-xs tracking-widest ${
                  metric === key ? "text-ink" : "text-ink-3"
                }`}
              >
                {GROWTH.toggle[key]}
                {metric === key ? (
                  <m.span layoutId="growth-underline" className="absolute inset-x-0 bottom-0 h-px bg-accent" />
                ) : null}
              </button>
            ))}
          </div>

          <div className="growth__chart relative">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              width="100%"
              role="img"
              aria-label={GROWTH.chartLabel}
              className="overflow-visible"
            >
              {[0.25, 0.5, 0.75].map((ratio) => (
                <line
                  key={ratio}
                  x1={PAD}
                  x2={WIDTH - PAD}
                  y1={PAD + ratio * (HEIGHT - PAD * 2)}
                  y2={PAD + ratio * (HEIGHT - PAD * 2)}
                  stroke="var(--c-line)"
                  strokeDasharray="3 4"
                  strokeWidth="0.8"
                />
              ))}

              <m.path
                d={geometry.area}
                fill="var(--c-accent-soft)"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 0.7 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              />

              <m.path
                d={geometry.line}
                fill="none"
                stroke="var(--c-accent)"
                strokeWidth="1.4"
                strokeLinecap="round"
                initial={reduce ? undefined : { pathLength: 0 }}
                whileInView={reduce ? undefined : { pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              />

              {geometry.coords.map((point, index) => {
                const value = point.value.toFixed(1);
                return (
                  <g key={point.month}>
                    <circle
                      cx={point.cx}
                      cy={point.cy}
                      r={7}
                      fill="transparent"
                      onClick={() => setSelected(index)}
                      style={{ cursor: "pointer" }}
                    />
                    <m.circle
                      cx={point.cx}
                      cy={point.cy}
                      r={2.4}
                      fill="var(--c-surface)"
                      stroke="var(--c-accent)"
                      strokeWidth="1.2"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + index * 0.04 }}
                      aria-label={GROWTH.tooltip(point.month, Number(value), unit)}
                    />
                  </g>
                );
              })}
            </svg>

            {activePoint ? (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] rounded-sm bg-ink px-2 py-1 text-[11px] text-bg"
                style={{ left: `${(activePoint.cx / WIDTH) * 100}%`, top: `${(activePoint.cy / HEIGHT) * 100}%` }}
              >
                {GROWTH.tooltip(activePoint.month, Number(activePoint.value.toFixed(1)), unit)}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {data.firsts && data.firsts.length > 0 ? (
        <div className="growth__firsts">
          <p className="label-text mt-6">{GROWTH.firstsTitle}</p>
          {data.firsts.map((item) => (
            <div key={`${item.label}-${item.at}`} className="growth__first">
              <span className="text-ink-2">{item.label}</span>
              <span className="num text-ink-3">{item.at}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
