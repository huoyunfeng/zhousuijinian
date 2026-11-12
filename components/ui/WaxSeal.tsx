"use client";

import { useId } from "react";
import clsx from "clsx";

interface WaxSealProps {
  char: string;
  className?: string;
  size?: number;
}

/** 纯 SVG 火漆印（DEV_SPEC 4.10.5）：不规则外沿 + 压印首字 + 两道高光 */
export function WaxSeal({ char, className, size = 56 }: WaxSealProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const waxId = `wax-${uid}`;
  const pressId = `press-${uid}`;

  return (
    <svg
      className={clsx("wax-seal", className)}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={waxId} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#C4564A" />
          <stop offset="55%" stopColor="#B23A2E" />
          <stop offset="100%" stopColor="#8E2A21" />
        </radialGradient>
        <radialGradient id={pressId} cx="42%" cy="36%" r="72%">
          <stop offset="0%" stopColor="#8B2920" />
          <stop offset="100%" stopColor="#A5352B" />
        </radialGradient>
      </defs>

      <path
        d="M50 3c7-1 13 2 18 6s13 5 16 11 2 13 4 20 7 13 5 20-9 11-13 17-6 15-13 18-14-2-21-1-14 5-21 2-8-12-12-18-10-11-11-18 5-12 7-19 0-14 4-20 12-6 19-10c6-3.5 12-7 18-8z"
        fill={`url(#${waxId})`}
      />
      <circle cx="50" cy="50" r="30" fill={`url(#${pressId})`} />
      <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255, 255, 255, 0.16)" strokeWidth="1" />

      {char ? (
        <>
          <text
            x="50"
            y="51.6"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="28"
            fill="rgba(255, 255, 255, 0.22)"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {char.slice(0, 1)}
          </text>
          <text
            x="50"
            y="50.6"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="28"
            fill="#7C221A"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {char.slice(0, 1)}
          </text>
        </>
      ) : null}

      <path
        d="M22 30c8-11 22-17 36-15"
        fill="none"
        stroke="rgba(255, 255, 255, 0.35)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M18 45c2-5 5-9 9-12"
        fill="none"
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
