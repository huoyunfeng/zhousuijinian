"use client";

import { useEffect, useState } from "react";
import { animate } from "framer-motion";

interface StatProps {
  label: string;
  value: number;
  unit: string;
  decimals?: number;
}

/** 数字滚动（DEV_SPEC 5.2） */
export function Stat({ label, value, unit, decimals = 1 }: StatProps) {
  const [display, setDisplay] = useState((0).toFixed(decimals));

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest.toFixed(decimals)),
    });
    return () => controls.stop();
  }, [decimals, value]);

  return (
    <div>
      <div className="label-text">{label}</div>
      <div className="mt-1 flex items-baseline justify-center gap-1">
        <span className="num stat__num text-2xl text-ink md:text-3xl">{display}</span>
        <span className="text-xs text-ink-3">{unit}</span>
      </div>
    </div>
  );
}

interface StaticStatProps {
  label: string;
  value: string;
  unit?: string;
}

export function StaticStat({ label, value, unit }: StaticStatProps) {
  return (
    <div>
      <div className="label-text">{label}</div>
      <div className="mt-1 flex items-baseline justify-center gap-1">
        <span className="num stat__num text-2xl text-ink md:text-3xl">{value}</span>
        {unit ? <span className="text-xs text-ink-3">{unit}</span> : null}
      </div>
    </div>
  );
}
