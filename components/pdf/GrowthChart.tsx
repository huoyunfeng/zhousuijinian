import { GROWTH } from "@/lib/copy";
import type { GrowthSection } from "@/lib/types";

const WIDTH = 900;
const HEIGHT = 520;
const PAD = 56;

interface GrowthChartProps {
  points: GrowthSection["points"];
}

/** 静态身高曲线：PDF 里不播动画，也不接受交互 */
export function GrowthChart({ points }: GrowthChartProps) {
  const sorted = [...points].sort((a, b) => a.month - b.month);
  if (sorted.length < 2) return null;

  const values = sorted.map((point) => point.height);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const low = min - span * 0.18;
  const high = max + span * 0.18;

  const x = (month: number) => PAD + (month / 12) * (WIDTH - PAD * 2);
  const y = (value: number) => HEIGHT - PAD - ((value - low) / (high - low)) * (HEIGHT - PAD * 2);

  const coords = sorted.map((point) => ({
    month: point.month,
    cx: x(point.month),
    cy: y(point.height),
  }));

  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.cx},${point.cy}`).join(" ");
  const area = `${line} L${coords[coords.length - 1].cx},${HEIGHT - PAD} L${coords[0].cx},${HEIGHT - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={GROWTH.chartLabel}>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={PAD}
          x2={WIDTH - PAD}
          y1={PAD + ratio * (HEIGHT - PAD * 2)}
          y2={PAD + ratio * (HEIGHT - PAD * 2)}
          stroke="var(--c-line)"
          strokeDasharray="4 6"
          strokeWidth="1"
        />
      ))}

      <path d={area} fill="var(--c-accent-soft)" opacity="0.7" />
      <path d={line} fill="none" stroke="var(--c-accent)" strokeWidth="2" strokeLinecap="round" />

      {coords.map((point) => (
        <circle
          key={point.month}
          cx={point.cx}
          cy={point.cy}
          r="4"
          fill="var(--c-surface)"
          stroke="var(--c-accent)"
          strokeWidth="1.6"
        />
      ))}

      {[0, 6, 12].map((month) => (
        <text
          key={month}
          x={x(month)}
          y={HEIGHT - PAD + 28}
          textAnchor={month === 0 ? "start" : month === 12 ? "end" : "middle"}
          fontSize="14"
          fill="var(--c-ink-3)"
        >
          {month}
        </text>
      ))}
    </svg>
  );
}
