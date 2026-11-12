interface IconProps {
  className?: string;
}

/** 毛笔：笔杆斜置 45°，笔毫三笔扫出（DEV_SPEC 6.4.2） */
export function Brush({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* 笔杆 */}
      <path d="M52.5 9.5 36.5 25.5" />
      <path d="M56.5 13.5 40.5 29.5" />
      <path d="M52.5 9.5 56.5 13.5" />
      <path d="M36.5 25.5 40.5 29.5" />
      {/* 笔斗 */}
      <path d="M36.5 29.5 42.5 23.5" />
      <path d="M40.5 33.5 46.5 27.5" />
      {/* 笔毫三笔 */}
      <path d="M37 30.5C33.5 35.5 30 41.5 27.5 48" />
      <path d="M39 31.5C36 37 33 42.5 31 48.5" />
      <path d="M41 32.5C38.5 37.5 36 43 35 48" />
    </svg>
  );
}
