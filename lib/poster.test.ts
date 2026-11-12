import { describe, expect, it } from "vitest";
import { POSTER_HEIGHT, POSTER_WIDTH, truncateLine, truncateLines } from "./poster";

describe("poster", () => {
  it("海报画布为 1080×1920", () => {
    expect(POSTER_WIDTH).toBe(1080);
    expect(POSTER_HEIGHT).toBe(1920);
  });

  it("单行超长时保留 maxChars 位并加省略号", () => {
    expect(truncateLine("小满", 10)).toBe("小满");
    expect(truncateLine("一二三四五六七", 5)).toBe("一二三四…");
    expect(truncateLine("一二三四五六七", 5)).toHaveLength(5);
  });

  it("多行按字数切分，最后一行裁剪", () => {
    const lines = truncateLines("一二三四五六七八九十", 4, 2);
    expect(lines).toEqual(["一二三四", "五六七…"]);
  });

  it("空白输入返回空数组", () => {
    expect(truncateLines("   \n  ", 10, 3)).toEqual([]);
  });
});
