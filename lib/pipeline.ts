import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ADMIN } from "./copy";
import { publicOrderDir } from "./story";

const IMAGE_RE = /\.(jpe?g|png|webp|avif|heic|heif)$/i;

export function photoKey(fileName: string): string {
  return fileName
    .replace(IMAGE_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface ProcessResult {
  images: number;
  totalBytes: number;
  warnings: string[];
}

/**
 * 图片管线（DEV_SPEC 8.5）：lg AVIF/WebP/JPG + md WebP + sm WebP + manifest(lqip)。
 * 与 scripts/assets.ts 同一套规则，后台上传后同步执行。
 */
export async function processOrderAssets(slug: string): Promise<ProcessResult> {
  const rawDir = path.join(process.cwd(), "content", "orders", slug, "raw");
  const outDir = publicOrderDir(slug);
  const warnings: string[] = [];

  if (!fs.existsSync(rawDir)) {
    throw new Error(`${ADMIN.detail.assets.missingRaw}：${rawDir}`);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(rawDir).filter((file) => IMAGE_RE.test(file)).sort();
  const manifest: Record<string, { w: number; h: number; lqip: string; v: string }> = {};

  for (const file of files) {
    const key = photoKey(file);
    if (!key) continue;
    const srcPath = path.join(rawDir, file);
    const srcStat = fs.statSync(srcPath);
    const input = sharp(srcPath).rotate();
    const meta = await input.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    const scale = Math.min(1, 1600 / Math.max(width, height || 1));

    const lg = input
      .clone()
      .resize({
        width: Math.round(width * scale),
        height: Math.round(height * scale),
        fit: "inside",
        withoutEnlargement: true,
      });

    await Promise.all([
      lg.clone().avif({ quality: 52, effort: 6 }).toFile(path.join(outDir, `${key}-lg.avif`)),
      lg.clone().webp({ quality: 60 }).toFile(path.join(outDir, `${key}-lg.webp`)),
      lg.clone().jpeg({ quality: 60, mozjpeg: true }).toFile(path.join(outDir, `${key}-lg.jpg`)),
      input
        .clone()
        .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 60 })
        .toFile(path.join(outDir, `${key}-md.webp`)),
      input
        .clone()
        .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 60 })
        .toFile(path.join(outDir, `${key}-sm.webp`)),
    ]);

    if (key === "cover") {
      await input
        .clone()
        .resize({ width: 1200, height: 630, fit: "cover", position: "top" })
        .jpeg({ quality: 72, mozjpeg: true })
        .toFile(path.join(outDir, "cover-og.jpg"));
    }

    const tiny = await input.clone().resize({ width: 20, height: 20, fit: "inside" }).webp({ quality: 30 }).toBuffer();
    manifest[key] = {
      w: Math.round(width * scale),
      h: Math.round(height * scale),
      lqip: `data:image/webp;base64,${tiny.toString("base64")}`,
      v: `${Math.round(srcStat.mtimeMs).toString(36)}-${srcStat.size.toString(36)}`,
    };
  }

  fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const bgm = path.join(rawDir, "bgm.mp3");
  if (fs.existsSync(bgm)) {
    const size = fs.statSync(bgm).size;
    if (size > 2.5 * 1024 * 1024) warnings.push(ADMIN.detail.assets.audioWarning);
    fs.copyFileSync(bgm, path.join(outDir, "bgm.mp3"));
  }

  const totalBytes = fs
    .readdirSync(outDir)
    .map((file) => fs.statSync(path.join(outDir, file)).size)
    .reduce((sum, size) => sum + size, 0);

  if (totalBytes > 3.5 * 1024 * 1024) warnings.push(ADMIN.detail.assets.budgetWarning);

  return { images: files.length, totalBytes, warnings };
}
