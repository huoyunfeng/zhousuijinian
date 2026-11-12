import type { ThemeKey } from "./types";

export const THEMES: ThemeKey[] = ["paper-warm", "film", "minimal"];

export function isThemeKey(value: string): value is ThemeKey {
  return THEMES.includes(value as ThemeKey);
}

export function isTheme(value: unknown): value is ThemeKey {
  return typeof value === "string" && isThemeKey(value);
}
