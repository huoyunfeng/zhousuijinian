import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { adminGuard, apiError, apiOk } from "@/lib/api";
import { ADMIN, API_ERRORS, VALIDATION } from "@/lib/copy";
import { findOrder } from "@/lib/orders";
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

/** 找到该前缀下一个未占用的编号（1..total），都已占用返回 null */
function nextSlot(rawDir: string, prefix: string, total: number): number | null {
  for (let index = 1; index <= total; index += 1) {
    const key = `${prefix}${String(index).padStart(2, "0")}`;
    const exists = fs
      .readdirSync(rawDir)
      .some((file) => file.replace(/\.[a-z0-9]+$/i, "").toLowerCase() === key);
    if (!exists) return index;
  }
  return null;
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

  const rawDir = path.join(orderDir(slug), "raw");
  fs.mkdirSync(rawDir, { recursive: true });

  const incoming = files.reduce((sum, file) => sum + file.size, 0);
  if (dirSize(rawDir) + incoming > MAX_ORDER_BYTES) {
    return apiError("SCHEMA_INVALID", ADMIN.detail.assets.orderTooLarge, 422);
  }

  const saved: string[] = [];
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
          target = `cover.${ext === "jpeg" ? "jpg" : ext}`;
        } else if (purpose === "monthly") {
          const slot = nextSlot(rawDir, "m", 12);
          if (slot === null) return apiError("SCHEMA_INVALID", ADMIN.detail.assets.slotFull, 422);
          target = `m${String(slot).padStart(2, "0")}.${ext}`;
        } else {
          const slot = nextSlot(rawDir, "p", 30);
          if (slot === null) return apiError("SCHEMA_INVALID", ADMIN.detail.assets.slotFull, 422);
          target = `p${String(slot).padStart(2, "0")}.${ext}`;
        }
      }

      fs.writeFileSync(path.join(rawDir, target), Buffer.from(await file.arrayBuffer()));
      saved.push(target);
    }

    const result = await processOrderAssets(slug);
    return apiOk({ saved, warnings: result.warnings, totalBytes: result.totalBytes });
  } catch (error) {
    return apiError(
      "INTERNAL",
      error instanceof Error ? error.message : API_ERRORS.INTERNAL,
      500,
    );
  }
}
