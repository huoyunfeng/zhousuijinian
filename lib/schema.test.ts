import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { storySchema } from "./schema";

const raw = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "content/orders/bb-20250417/story.json"), "utf8"),
) as Record<string, unknown>;

function clone(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
}

function section(data: Record<string, unknown>, kind: string): Record<string, unknown> {
  const sections = data.sections as Record<string, unknown>[];
  const found = sections.find((entry) => entry.kind === kind);
  if (!found) throw new Error(`missing section ${kind}`);
  return found;
}

describe("story schema", () => {
  it("示例订单通过校验", () => {
    expect(storySchema.safeParse(raw).success).toBe(true);
  });

  it("缺少必填字段时给出精确路径", () => {
    const data = clone();
    delete section(data, "hero").name;
    const result = storySchema.safeParse(data);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path.join(".") === "sections.0.name")).toBe(true);
  });

  it("未来信解锁日期不能早于出生日期", () => {
    const data = clone();
    section(data, "futureLetter").unlockAt = "2024-01-01";
    const result = storySchema.safeParse(data);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path.includes("unlockAt"))).toBe(true);
  });

  it("信件正文超过 800 字被拒", () => {
    const data = clone();
    section(data, "letter").body = "字".repeat(801);
    const result = storySchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("未知章节类型被拒", () => {
    const data = clone();
    section(data, "outro").kind = "video";
    expect(storySchema.safeParse(data).success).toBe(false);
  });

  it("主题只接受三套预设", () => {
    const data = clone();
    data.theme = "cyberpunk";
    expect(storySchema.safeParse(data).success).toBe(false);
  });
});
