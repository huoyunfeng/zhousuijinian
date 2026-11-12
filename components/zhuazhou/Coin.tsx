interface IconProps {
  className?: string;
}

/** 铜钱：外圆内方 + 边缘做旧（DEV_SPEC 6.4.2） */
export function Coin({ className }: IconProps) {
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
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="17" opacity="0.55" />
      <path d="M25 25H39V39H25Z" />
      {/* 做旧：断续的缘线 */}
      <circle cx="32" cy="32" r="22" strokeWidth="2.6" strokeDasharray="2 13" opacity="0.5" />
      <circle cx="32" cy="32" r="12.5" strokeDasharray="1.5 9" opacity="0.4" />
    </svg>
  );
}
