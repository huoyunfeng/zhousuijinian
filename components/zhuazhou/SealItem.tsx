interface IconProps {
  className?: string;
}

/** 印章：方印 + 兽钮剪影 + 一点朱泥（DEV_SPEC 6.4.2） */
export function SealItem({ className }: IconProps) {
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
      {/* 兽钮 */}
      <path
        d="M24.5 27C23.5 22 25.5 18.5 28.5 17.5C29.5 14.5 32.5 14 34 16C36.5 15.5 39 17.5 39.5 20C42 21.5 42.5 24.5 41.5 27"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <path d="M30.5 17.5C31.5 16 33.5 16 34.5 17.5" />
      {/* 方印 */}
      <path d="M19.5 27H44.5A2 2 0 0 1 46.5 29V51.5A2 2 0 0 1 44.5 53.5H19.5A2 2 0 0 1 17.5 51.5V29A2 2 0 0 1 19.5 27Z" />
      {/* 印面 */}
      <path d="M17.5 47.5H46.5" />
      {/* 朱泥 */}
      <path d="M49.5 55.5C52 54.5 54.8 56.4 54 59C53.2 61.4 49.8 61 48.8 59.2C48 57.8 48.2 56.2 49.5 55.5Z" fill="#B23A2E" stroke="none" />
    </svg>
  );
}
