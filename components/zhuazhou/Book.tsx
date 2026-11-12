interface IconProps {
  className?: string;
}

/** 线装书：三孔线装 + 书页微卷（DEV_SPEC 6.4.2） */
export function Book({ className }: IconProps) {
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
      {/* 书页从封面左侧露出、微微卷起 */}
      <path d="M14 17.5C11 19.5 10.5 24 11.5 28.5C12.2 32 11 37 12.5 41" />
      <path d="M14 20.5C12 24 12 30 12.8 34" opacity="0.5" />
      {/* 封面 */}
      <path d="M14 12.5H48A4 4 0 0 1 52 16.5V48A4 4 0 0 1 48 52H14A3.5 3.5 0 0 1 10.5 48.5V16A3.5 3.5 0 0 1 14 12.5Z" />
      {/* 题签 */}
      <path d="M28.5 19V41H41.5V19Z" />
      {/* 三孔线装 */}
      <circle cx="45.5" cy="21" r="1.5" />
      <circle cx="45.5" cy="32" r="1.5" />
      <circle cx="45.5" cy="43" r="1.5" />
      <path d="M45.5 21H51.5" />
      <path d="M45.5 32H51.5" />
      <path d="M45.5 43H51.5" />
    </svg>
  );
}
