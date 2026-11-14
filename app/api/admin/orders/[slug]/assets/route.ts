import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { adminGuard, apiError, apiOk } from "@/lib/api";
import { ADMIN, API_ERRORS, VALIDATION } from "@/lib/copy";
import { findOrder, syncStoryAssetRefs } from "@/lib/orders";
import { orderDir } from "@/lib/story";
import { processOrderAssets } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ slug: string }>;
}

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif", "heic", "heif"]);
const MAX_ORDER_BYTES = 500 * 1024 * 1024;
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const GALLERY_SLOTS = 30;
const PURPOSES = new Set(["cover", "monthly", "gallery", "bgm"]);

function fileExt(name: string): string {
  const ext = path.extname(name).replace(".", "").toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

function dirSize(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => fs.statSync(path.join(dir, entry.name)).size)
    .reduce((sum, size) => sum + size, 0);
}

/** 目录中该前缀已占用的编号（1..total） */
function occupiedSlots(rawDir: string, prefix: string, total: number): Set<number> {
  const names = fs.readdirSync(rawDir);
  const occupied = new Set<number>();
  for (let index = 1; index <= total; index += 1) {
    const key = `${prefix}${String(index).padStart(2, "0")}`;
    if (names.some((file) => file.replace(/\.[a-z0-9]+$/i, "").toLowerCase() === key)) {
      occupied.add(index);
    }
  }
  return occupied;
}

/** 该前缀的空槽位，按编号升序 */
function freeSlots(occupied: Set<number>, total: number): number[] {
  const free: number[] = [];
  for (let index = 1; index <= total; index += 1) {
    if (!occupied.has(index)) free.push(index);
  }
  return free;
}

/** 覆盖前清理同编号的其它扩展名文件，避免同一槽位留下两份 */
function removeOtherExt(rawDir: string, key: string, keepExt: string): void {
  for (const file of fs.readdirSync(rawDir)) {
    if (file.replace(/\.[a-z0-9]+$/i, "").toLowerCase() !== key) continue;
    if (fileExt(file) !== keepExt) fs.unlinkSync(path.join(rawDir, file));
  }
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const denied = await adminGuard();
  if (denied) return denied;

  const { slug } = await context.params;
  const order = await findOrder(slug);
  if (!order) return apiError("NOT_FOUND", API_ERRORS.NOT_FOUND, 404);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("SCHEMA_INVALID", ADMIN.detail.assets.noFiles, 422);
  }

  const purpose = String(form.get("purpose") ?? "");
  if (!PURPOSES.has(purpose)) {
    return apiError("SCHEMA_INVALID", VALIDATION.missingField, 422);
  }

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return apiError("SCHEMA_INVALID", ADMIN.detail.assets.noFiles, 422);
  }

  // 月照按月上传：必须指定月份，且每次一张
  const isMonthly = purpose === "monthly";
  const month = isMonthly ? Number.parseInt(String(form.get("month") ?? ""), 10) : 0;
  if (isMonthly) {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return apiError("SCHEMA_INVALID", ADMIN.detail.assets.monthInvalid, 422);
    }
    if (files.length !== 1) {
      return apiError("SCHEMA_INVALID", ADMIN.detail.assets.monthOne, 422);
    }
  }

  const rawDir = path.join(orderDir(slug), "raw");
  fs.mkdirSync(rawDir, { recursive: true });

  const incoming = files.reduce((sum, file) => sum + file.size, 0);
  if (dirSize(rawDir) + incoming > MAX_ORDER_BYTES) {
    return apiError("SCHEMA_INVALID", ADMIN.detail.assets.orderTooLarge, 422);
  }

  const isGallery = purpose === "gallery";
  const occupied = isGallery ? occupiedSlots(rawDir, "p", GALLERY_SLOTS) : new Set<number>();
  const free = isGallery ? freeSlots(occupied, GALLERY_SLOTS) : [];

  const saved: string[] = [];
  const replaced: string[] = [];
  const months: Array<{ month: number; src: string }> = [];
  const gallery: string[] = [];
  let cover: string | undefined;
  let assigned = 0;
  try {
    for (const file of files) {
      const ext = fileExt(file.name);
      let target: string | null = null;

      if (purpose === "bgm") {
        if (ext !== "mp3") {
          return apiError("SCHEMA_INVALID", ADMIN.detail.assets.unsupported, 422);
        }
        if (file.size > MAX_AUDIO_BYTES) {
          return apiError("AUDIO_TOO_LARGE", VALIDATION.audioTooLarge, 422);
        }
        target = "bgm.mp3";
      } else {
        if (!IMAGE_EXT.has(ext)) {
          return apiError("SCHEMA_INVALID", ADMIN.detail.assets.unsupported, 422);
        }
        if (purpose === "cover") {
          target = `cover.${ext}`;
          removeOtherExt(rawDir, "cover", ext);
          cover = target;
        } else if (isMonthly) {
          // 指定月份直接落到对应槽位，重复上传即替换
          const key = `m${String(month).padStart(2, "0")}`;
          if (occupiedSlots(rawDir, "m", 12).has(month)) replaced.push(key);
          removeOtherExt(rawDir, key, ext);
          target = `${key}.${ext}`;
          months.push({ month, src: target });
        } else {
          // 精选：先填空位；槽位全满时从 01 开始按顺序覆盖
          const slot =
            assigned < free.length ? free[assigned] : ((assigned - free.length) % GALLERY_SLOTS) + 1;
          assigned += 1;
          const key = `p${String(slot).padStart(2, "0")}`;
          if (occupied.has(slot)) replaced.push(key);
          removeOtherExt(rawDir, key, ext);
          target = `${key}.${ext}`;
          gallery.push(target);
        }
      }

      fs.writeFileSync(path.join(rawDir, target), Buffer.from(await file.arrayBuffer()));
      saved.push(target);
    }

    // 文件落盘后同步 story.json 引用，否则新图不会出现在页面里
    syncStoryAssetRefs(slug, { cover, months, gallery });

    const result = await processOrderAssets(slug);
    const warnings = [...result.warnings];
    if (isGallery && replaced.length > 0) {
      warnings.unshift(ADMIN.detail.assets.overwritten(replaced.join("、")));
    }
    return apiOk({ saved, warnings, totalBytes: result.totalBytes });
  } catch (error) {
    return apiError(
      "INTERNAL",
      error instanceof Error ? error.message : API_ERRORS.INTERNAL,
      500,
    );
  }
}
