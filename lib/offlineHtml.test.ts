import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildOfflineHtml } from "./offlineHtml";
import { normalize } from "./story";
import { storySchema } from "./schema";
import type { Story } from "./types";

function loadSample(): Story {
  const file = path.resolve(process.cwd(), "content/orders/bb-20250417/story.json");
  const raw: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  return normalize(storySchema.parse(raw), { today: "2026-05-01" });
}

function sampleHtml(overrides: Partial<Parameters<typeof buildOfflineHtml>[0]> = {}): string {
  const story = loadSample();
  return buildOfflineHtml({
    story,
    images: {},
    audio: null,
    tokensCss: ":root{--c-bg:#fff}",
    generatedAt: "2026-11-10",
    version: 2,
    contact: "hello@example.com",
    ...overrides,
  });
}

describe("buildOfflineHtml", () => {
  const html = sampleHtml();

  it("单文件、无外链、无 ES module", () => {
    expect(html).not.toContain("http://");
    expect(html).not.toContain("https://");
    expect(html).not.toContain('<script type="module"');
    expect(html).toContain("window.__STORY__");
  });

  it("未来信只保留信封，正文不出现", () => {
    expect(html).toContain("2043.04.17");
    expect(html).not.toContain("如果你读到这里");
    expect(html).not.toContain("2043 年，你十八岁");
    expect(html).toContain("这一天再打开");
  });

  it("页脚有生成日期、版本号、内容清单与联系方式", () => {
    expect(html).toContain("生成于 2026-11-10 · 第 2 版");
    expect(html).toContain("包含：封面");
    expect(html).toContain("联系我们：hello@example.com");
    expect(html).toContain("音乐未包含");
  });

  it("不包含密码门与分享二维码", () => {
    expect(html).not.toContain('"password"');
    expect(html).not.toContain("<canvas");
  });

  it("图片以 data URI 内联", () => {
    const story = loadSample();
    const hero = story.sections.find((section) => section.kind === "hero");
    if (!hero || hero.kind !== "hero") throw new Error("缺少封面");
    const withImage = sampleHtml({
      images: { [hero.cover.src]: "data:image/jpeg;base64,AAAA" },
    });
    expect(withImage).toContain("data:image/jpeg;base64,AAAA");
  });

  it("文本与内联 JSON 都做转义", () => {
    const story = loadSample();
    const injected = {
      ...story,
      meta: { ...story.meta, title: "</script><b>注入</b>" },
    };
    const output = sampleHtml({ story: injected });
    expect(output).not.toContain("</script><b>");
    expect(output).toContain("\\u003c/script>");
    expect(output).toContain("&lt;/script&gt;");
  });
});
