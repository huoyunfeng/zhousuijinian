import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { adminGuard, apiError, apiOk } from "@/lib/api";
import { ADMIN, API_ERRORS, VALIDATION } from "@/lib/copy";
import { findOrder } from "@/lib/orders";
import { loadStory, publicOrderDir, referencedAssets, StoryError } from "@/lib/story";
import { photoKey } from "@/lib/pipeline";
import { writeQr } from "@/lib/qr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ slug: string }>;
}

const VARIANTS = ["-lg.avif", "-lg.webp", "-lg.jpg", "-md.webp", "-sm.webp"];
const BUDGET_BYTES = 3.5 * 1024 * 1024;

/** 引用的图片在 public 目录是否有产物（管线输出按 key 命名） */
function assetExists(outDir: string, src: string): boolean {
  const key = photoKey(src);
  if (key && VARIANTS.some((suffix) => fs.existsSync(path.join(outDir, `${key}${suffix}`)))) {
    return true;
  }
  return fs.existsSync(path.join(outDir, src));
}

export async function POST(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) return denied;

  const { slug } = await context.params;
  const order = await findOrder(slug);
  if (!order) return apiError("NOT_FOUND", API_ERRORS.NOT_FOUND, 404);

  // 1. story.json 校验
  let story;
  try {
    story = await loadStory(slug);
  } catch (error) {
    if (error instanceof StoryError) {
      return apiError("SCHEMA_INVALID", error.message, 422, error.issues);
    }
    return apiError(
      "INTERNAL",
      error instanceof Error ? error.message : API_ERRORS.INTERNAL,
      500,
    );
  }
  if (!story) return apiError("NOT_FOUND", API_ERRORS.NOT_FOUND, 404);

  // 2. 引用的线上资源是否都存在
  const outDir = publicOrderDir(slug);
  const missing = referencedAssets(story).filter((src) => !assetExists(outDir, src));
  if (missing.length > 0) {
    return apiError(
      "ASSET_MISSING",
      VALIDATION.assetMissingSummary(missing.length),
      422,
      missing,
    );
  }

  try {
    // 3. 生成二维码
    await writeQr(slug);

    // 4. 体积预算只提醒，不阻断
    const totalBytes = fs
      .readdirSync(outDir)
      .map((file) => fs.statSync(path.join(outDir, file)).size)
      .reduce((sum, size) => sum + size, 0);
    const warnings: string[] = [];
    if (totalBytes > BUDGET_BYTES) warnings.push(ADMIN.detail.assets.budgetWarning);

    // 5. 返回预览链接
    return apiOk({ previewUrl: `/s/${slug}?preview=1`, warnings, totalBytes });
  } catch (error) {
    return apiError(
      "INTERNAL",
      error instanceof Error ? error.message : API_ERRORS.INTERNAL,
      500,
    );
  }
}
