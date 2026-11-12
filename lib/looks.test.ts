import { describe, expect, it } from "vitest";
import { LOOKS } from "./copy";
import { LOOK_CONFIG, LOOK_KEYS, LOOK_RECIPE_VERSION } from "./looks";

describe("LOOK_KEYS", () => {
  it("六种配方且顺序固定", () => {
    expect([...LOOK_KEYS]).toEqual(["none", "warm", "film", "mono", "soft", "punch"]);
  });

  it("配方版本是正整数", () => {
    expect(Number.isInteger(LOOK_RECIPE_VERSION)).toBe(true);
    expect(LOOK_RECIPE_VERSION).toBeGreaterThan(0);
  });

  it("每种配方都有配置", () => {
    expect(Object.keys(LOOK_CONFIG)).toEqual([...LOOK_KEYS]);
  });
});

describe("LOOKS 文案", () => {
  it("与 LOOK_KEYS 一一对应", () => {
    expect(Object.keys(LOOKS)).toEqual([...LOOK_KEYS]);
  });

  it("每项都有中文文案", () => {
    for (const key of LOOK_KEYS) {
      expect(LOOKS[key].length).toBeGreaterThan(0);
    }
  });
});
