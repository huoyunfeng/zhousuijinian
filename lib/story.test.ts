import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { storySchema, type ParsedStory } from "./schema";
import { SECTION_ORDER, normalize } from "./story";
import { TIMELINE } from "./copy";

const raw = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "content/orders/bb-20250417/story.json"), "utf8"),
) as Record<string, unknown>;

function parsed(): ParsedStory {
  return storySchema.parse(JSON.parse(JSON.stringify(raw)));
}

describe("normalize", () => {
  it("章节按固定顺序输出", () => {
    const input = parsed();
    input.sections.reverse();
    const story = normalize(input);
    expect(story.sections.map((section) => section.kind)).toEqual(
      SECTION_ORDER.filter((kind) => story.sections.some((section) => section.kind === kind)),
    );
  });

  it("缺失的月份补占位，永远 12 条", () => {
    const input = parsed();
    const timeline = input.sections.find((section) => section.kind === "timeline12");
    if (!timeline || timeline.kind !== "timeline12") throw new Error("timeline missing");
    timeline.items = timeline.items.filter((item) => item.month !== 2 && item.month !== 5);
    const story = normalize(input);
    const normalized = story.sections.find((section) => section.kind === "timeline12");
    if (!normalized || normalized.kind !== "timeline12") throw new Error("timeline missing");
    expect(normalized.items).toHaveLength(12);
    const february = normalized.items.find((item) => item.month === 2);
    expect(february?.placeholder).toBe(true);
    expect(february?.note).toBe(TIMELINE.placeholder);
  });

  it("重复月份只保留一条", () => {
    const input = parsed();
    const timeline = input.sections.find((section) => section.kind === "timeline12");
    if (!timeline || timeline.kind !== "timeline12") throw new Error("timeline missing");
    timeline.items.push({ ...timeline.items[0], note: "重复的三个月" });
    const story = normalize(input);
    const normalized = story.sections.find((section) => section.kind === "timeline12");
    if (!normalized || normalized.kind !== "timeline12") throw new Error("timeline missing");
    expect(normalized.items).toHaveLength(12);
    expect(normalized.items.filter((item) => item.month === 1)).toHaveLength(1);
  });

  it("照片墙去重并截断到 60 张", () => {
    const input = parsed();
    const gallery = input.sections.find((section) => section.kind === "gallery");
    if (!gallery || gallery.kind !== "gallery") throw new Error("gallery missing");
    gallery.photos = Array.from({ length: 65 }, (_, index) => ({
      src: `p${String(index + 1).padStart(2, "0")}.jpg`,
      alt: "",
      ratio: "4:5" as const,
    }));
    const story = normalize(input);
    const normalized = story.sections.find((section) => section.kind === "gallery");
    if (!normalized || normalized.kind !== "gallery") throw new Error("gallery missing");
    expect(normalized.photos).toHaveLength(60);
  });

  it("标题未解锁时正文不进入页面数据", () => {
    const input = parsed();
    const future = input.sections.find((section) => section.kind === "futureLetter");
    if (!future || future.kind !== "futureLetter") throw new Error("future missing");
    expect(future.body.length).toBeGreaterThan(0);

    const lockedStory = normalize(input, { today: "2026-11-10" });
    const locked = lockedStory.sections.find((section) => section.kind === "futureLetter");
    if (!locked || locked.kind !== "futureLetter") throw new Error("future missing");
    expect(locked.locked).toBe(true);
    expect(locked.body).toBe("");

    const unlockedStory = normalize(input, { today: future.unlockAt });
    const unlocked = unlockedStory.sections.find((section) => section.kind === "futureLetter");
    if (!unlocked || unlocked.kind !== "futureLetter") throw new Error("future missing");
    expect(unlocked.locked).toBe(false);
    expect(unlocked.body.length).toBeGreaterThan(0);
  });

  it("空的祝福与不足 3 件的抓周自动关闭", () => {
    const input = parsed();
    for (const section of input.sections) {
      if (section.kind === "guestbook") section.messages = [];
      if (section.kind === "zhuazhou") section.items = section.items.slice(0, 2);
    }
    const story = normalize(input);
    expect(story.sections.find((section) => section.kind === "guestbook")?.enabled).toBe(false);
    expect(story.sections.find((section) => section.kind === "zhuazhou")?.enabled).toBe(false);
  });
});
