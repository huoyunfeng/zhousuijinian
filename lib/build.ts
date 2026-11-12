import fs from "node:fs";
import path from "node:path";
import { loadStory, publicOrderDir, referencedAssets } from "./story";
import { ADMIN, VALIDATION } from "./copy";
import { writeQr } from "./qr";

export interface BuildResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  url?: string;
  totalBytes?: number;
}

/** 生成前自检（DEV_SPEC 8.6）：失败即不生成二维码 */
export async function buildOrder(slug: string): Promise<BuildResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let story;
  try {
    story = await loadStory(slug);
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : VALIDATION.schemaFailed],
      warnings,
    };
  }
  if (!story) return { ok: false, errors: [VALIDATION.schemaFailed], warnings };

  const dir = publicOrderDir(slug);
  const missing: string[] = [];
  for (const file of referencedAssets(story)) {
    if (!file) continue;
    if (!fs.existsSync(path.join(dir, file))) missing.push(file);
  }
  if (missing.length > 0) {
    errors.push(`${VALIDATION.assetMissingSummary(missing.length)}：${missing.slice(0, 6).join(", ")}`);
  }

  const hero = story.sections.find((section) => section.kind === "hero");
  if (hero && hero.kind === "hero" && !fs.existsSync(path.join(dir, hero.cover.src))) {
    errors.push(VALIDATION.coverMissing);
  }

  const timeline = story.sections.find((section) => section.kind === "timeline12");
  if (timeline && timeline.kind === "timeline12" && timeline.items.length < 12) {
    warnings.push(VALIDATION.timelineFew);
  }

  const enabled = story.sections.filter((section) => section.enabled).length;
  if (enabled < story.sections.length / 2) warnings.push(VALIDATION.sectionsMostDisabled);

  const bgmRaw = path.join(process.cwd(), "content", "orders", slug, "raw", "bgm.mp3");
  if (fs.existsSync(bgmRaw) && fs.statSync(bgmRaw).size > 2.5 * 1024 * 1024) {
    errors.push(VALIDATION.audioTooLarge);
  }

  if (errors.length === 0) {
    const url = await writeQr(slug);
    const totalBytes = fs.existsSync(dir)
      ? fs
          .readdirSync(dir)
          .map((file) => fs.statSync(path.join(dir, file)).size)
          .reduce((sum, size) => sum + size, 0)
      : 0;
    if (totalBytes > 3.5 * 1024 * 1024) warnings.push(ADMIN.detail.assets.budgetWarning);
    return { ok: true, errors, warnings, url, totalBytes };
  }

  return { ok: false, errors, warnings };
}
