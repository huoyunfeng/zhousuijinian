import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalize } from "./story";
import { storySchema } from "./schema";
import { htmlFileName, pdfFileName, planPdfPages, splitLetter } from "./pdf";
import type { Story } from "./types";

function loadSample(): Story {
  const file = path.resolve(process.cwd(), "content/orders/bb-20250417/story.json");
  const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  return normalize(storySchema.parse(raw), { today: "2026-05-01" });
}

describe("planPdfPages", () => {
  const story = loadSample();
  const plan = planPdfPages(story);

  it("十二个月按 1–6 / 7–12 分两页", () => {
    expect(plan.months[0]).toHaveLength(6);
    expect(plan.months[1]).toHaveLength(6);
    expect(plan.months[0][0].month).toBe(1);
    expect(plan.months[1][5].month).toBe(12);
  });

  it("照片墙每页 9 张", () => {
    expect(plan.gallery[0]).toHaveLength(9);
    expect(plan.gallery[1]).toHaveLength(9);
  });

  it("信固定分三页", () => {
    expect(plan.letter?.pages).toHaveLength(3);
    expect(plan.letter?.pages.join("\n")).toContain("你来的那天");
  });

  it("祝福最多 12 条，超出时保留 total", () => {
    const copy = JSON.parse(JSON.stringify(story)) as Story;
    const guestbook = copy.sections.find((section) => section.kind === "guestbook");
    if (!guestbook || guestbook.kind !== "guestbook") throw new Error("缺少祝福章节");
    guestbook.messages = Array.from({ length: 14 }, (_, index) => ({
      text: `祝福 ${index}`,
      from: `亲友 ${index}`,
    }));

    const overflow = planPdfPages(copy);
    expect(overflow.guestbook?.messages).toHaveLength(12);
    expect(overflow.guestbook?.total).toBe(14);
  });

  it("未来信只保留信封信息，不包含正文", () => {
    expect(plan.future).not.toBeNull();
    expect(JSON.stringify(plan.future)).not.toContain("如果你读到这里");
    expect(JSON.stringify(plan.future)).not.toContain("body");
    expect(plan.future?.unlockText).toBe("2043.04.17");
  });

  it("缺章时仍能产出完整计划（月份补占位）", () => {
    const minimal: Story = {
      ...story,
      sections: story.sections.filter((section) => section.kind === "hero"),
    };
    const empty = planPdfPages(minimal);
    expect(empty.months[0]).toHaveLength(6);
    expect(empty.months[0][0].placeholder).toBe(true);
    expect(empty.gallery[0]).toHaveLength(0);
    expect(empty.letter).toBeNull();
    expect(empty.future).toBeNull();
  });
});

describe("splitLetter", () => {
  it("三页、顺序不变", () => {
    const body = "第一段。\n第二段。\n第三段。\n第四段。\n第五段。\n第六段。";
    const pages = splitLetter(body, 3);
    expect(pages).toHaveLength(3);
    expect(pages.join("\n")).toBe(body);
    expect(pages[0]).toContain("第一段");
    expect(pages[2]).toContain("第六段");
  });

  it("空正文返回三页空串", () => {
    expect(splitLetter("", 3)).toEqual(["", "", ""]);
  });
});

describe("文件名", () => {
  it("清掉空格、括号与 emoji", () => {
    expect(pdfFileName(" 小 满 (测试) 🎂 ")).toBe("小满测试的一周岁.pdf");
    expect(htmlFileName("小满")).toBe("小满的一周岁.html");
  });

  it("版本号大于 1 时带 v 后缀", () => {
    expect(pdfFileName("小满", 2)).toBe("小满的一周岁_v2.pdf");
  });
});
