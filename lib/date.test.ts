import { describe, expect, it } from "vitest";
import {
  ageParts,
  ageText,
  anniversaryDate,
  daysBetween,
  daysLeft,
  dottedDate,
  isExpired,
  shanghaiToday,
} from "./date";

describe("date", () => {
  it("按 Asia/Shanghai 取当天日期（跨 UTC 零点）", () => {
    expect(shanghaiToday(new Date("2026-11-09T17:00:00Z"))).toBe("2026-11-10");
    expect(shanghaiToday(new Date("2026-11-09T15:59:59Z"))).toBe("2026-11-09");
  });

  it("生日当天显示 365 天，不提前变成 1 岁", () => {
    expect(ageText("2025-04-17", "2026-04-17")).toBe("365 天");
    expect(ageText("2025-04-17", "2026-04-16")).toBe("364 天");
  });

  it("闰年出生：周岁按次年 2/28 计算", () => {
    expect(anniversaryDate("2024-02-29", 1)).toBe("2025-02-28");
    expect(anniversaryDate("2024-02-29", 4)).toBe("2028-02-29");
    expect(ageText("2024-02-29", "2025-02-28")).toBe("365 天");
  });

  it("生日之后显示「1 岁 M 个月」", () => {
    expect(ageText("2025-04-17", "2026-07-17")).toBe("1 岁 3 个月");
    expect(ageText("2025-04-17", "2026-05-16")).toBe("1 岁");
    expect(ageParts("2025-04-17", "2026-07-17")).toEqual({ years: 1, months: 3 });
  });

  it("未来信倒计时按日边界计算，负数归零", () => {
    expect(daysLeft("2043-04-17", "2043-04-17")).toBe(0);
    expect(daysLeft("2043-04-17", "2043-04-16")).toBe(1);
    expect(daysLeft("2025-01-01", "2026-01-01")).toBe(0);
  });

  it("到期当天仍可访问，次日过期", () => {
    expect(isExpired("2026-11-10", "2026-11-10")).toBe(false);
    expect(isExpired("2026-11-09", "2026-11-10")).toBe(true);
    expect(isExpired(undefined, "2026-11-10")).toBe(false);
  });

  it("天数差不受本地时区影响", () => {
    expect(daysBetween("2025-04-17", "2026-04-17")).toBe(365);
    expect(dottedDate("2026-04-17")).toBe("2026.04.17");
  });
});
