import type { Config } from "tailwindcss";

/**
 * 组件里只写语义类（bg / surface / ink / accent …）。
 * 语义类全部映射到 app/themes.css 的 CSS 变量，禁止出现裸色值。
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--c-bg)",
        surface: "var(--c-surface)",
        ink: "var(--c-ink)",
        "ink-2": "var(--c-ink-2)",
        "ink-3": "var(--c-ink-3)",
        line: "var(--c-line)",
        accent: "var(--c-accent)",
        "accent-soft": "var(--c-accent-soft)",
        gold: "var(--c-gold)",
        overlay: "var(--c-overlay)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        num: "var(--font-num)",
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "24px",
        6: "32px",
        7: "48px",
        8: "64px",
        9: "96px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "16px",
        full: "999px",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        soft: "var(--ease-soft)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
      },
    },
  },
  plugins: [],
} satisfies Config;
