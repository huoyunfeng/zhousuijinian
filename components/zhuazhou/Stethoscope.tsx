interface IconProps {
  className?: string;
}

/** 听诊器：双耳管 + 胸件（DEV_SPEC 6.4.2） */
export function Stethoscope({ className }: IconProps) {
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
      {/* 双耳 */}
      <path d="M21.5 12C17 19 17 27 25.5 32.5" />
      <path d="M42.5 12C47 19 47 27 38.5 32.5" />
      <circle cx="21.5" cy="11.5" r="1.8" />
      <circle cx="42.5" cy="11.5" r="1.8" />
      {/* 汇合与软管 */}
      <path d="M25.5 32.5C28 34.8 36 34.8 38.5 32.5" />
      <path d="M32 34.5V38.5C32 46 36 50.5 43 50.5" />
      {/* 胸件 */}
      <circle cx="46.5" cy="50.5" r="5.5" />
      <circle cx="46.5" cy="50.5" r="2" />
    </svg>
  );
}
