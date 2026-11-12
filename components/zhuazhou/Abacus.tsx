interface IconProps {
  className?: string;
}

/** 算盘：两档五珠 + 厚框（DEV_SPEC 6.4.2） */
export function Abacus({ className }: IconProps) {
  const beads = [23, 33.5, 37.5, 41.5, 45.5];

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
      {/* 厚框 */}
      <path d="M10.5 10.5H53.5A3 3 0 0 1 56.5 13.5V50.5A3 3 0 0 1 53.5 53.5H10.5A3 3 0 0 1 7.5 50.5V13.5A3 3 0 0 1 10.5 10.5Z" />
      <path d="M13.5 16.5H50.5V47.5H13.5Z" />
      {/* 横梁 */}
      <path d="M13.5 29H50.5" />
      <path d="M13.5 31.5H50.5" />
      {/* 两档直杆 */}
      <path d="M25 16.5V47.5" />
      <path d="M39 16.5V47.5" />
      {/* 五珠 */}
      {[25, 39].map((x) =>
        beads.map((y) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={4.4} ry={2} />),
      )}
    </svg>
  );
}
