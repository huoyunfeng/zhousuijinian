/**
 * 图片管线 CLI（DEV_SPEC 8.5 / 8.5.1 / 4.10）
 * 用法：pnpm assets --slug=bb-20250417 [--look=warm]
 *
 * 输入 content/orders/{slug}/raw/，输出 public/orders/{slug}/
 * 顺序：rotate → resize(1600) → 曝光归一 → applyLook → 三档 + lqip
 * 幂等：每次先清空输出目录，永远从 raw 出发，不叠加滤镜
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { LOOKS, LOOKS_SHEET } from "../lib/copy.ts";
import {
  LOOK_KEYS,
  LOOK_RECIPE_VERSION,
  applyLook,
  normalizeExposure,
  type LookKey,
} from "../lib/looks.ts";

const SLUG_RE = /^[a-z0-9-]{3,40}$/;
const IMAGE_RE = /\.(jpe?g|png|webp|avif|heic|heif)$/i;
const MAX_EDGE = 1600;
const SIGNATURE_FILE = "signature.png";
const SIGNATURE_INK = { r: 0x2b, g: 0x26, b: 0x22 } as const;

const SHEET = {
  width: 1800,
  height: 1200,
  columns: 3,
  quality: 82,
  label: {
    height: 88,
    padding: 20,
    fontSize: 30,
    background: "#FBF7F0",
    ink: "#2B2622",
  },
} as const;

interface PhotoRef {
  src: string;
  look?: string;
}

interface SectionLike {
  kind: string;
  cover?: PhotoRef;
  items?: Array<{ photo?: PhotoRef }>;
  photos?: PhotoRef[];
  groups?: Array<{ photos?: PhotoRef[] }>;
  handwriting?: PhotoRef;
}

interface StoryMeta {
  look?: string;
  signature?: string;
  [key: string]: unknown;
}

interface StoryFile {
  meta?: StoryMeta;
  sections?: SectionLike[];
}

interface Raster {
  image: sharp.Sharp;
  width: number;
  height: number;
}

interface ManifestEntry {
  w: number;
  h: number;
  lqip: string;
  /** 内容版本号：素材或调色变化后更新，用于绕开图片长缓存 */
  v: string;
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

function keyOf(fileName: string): string {
  return fileName
    .replace(IMAGE_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function humanSize(bytes: number): string {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)}MB`
    : `${(bytes / 1024).toFixed(0)}KB`;
}

function isLookKey(value: string): value is LookKey {
  return (LOOK_KEYS as readonly string[]).includes(value);
}

function asLook(value: unknown): LookKey | undefined {
  return typeof value === "string" && isLookKey(value) ? value : undefined;
}

function collectLooks(story: StoryFile, fallback: LookKey): Map<string, LookKey> {
  const map = new Map<string, LookKey>();
  const add = (photo?: PhotoRef): void => {
    if (!photo?.src) return;
    map.set(photo.src, asLook(photo.look) ?? fallback);
  };
  for (const section of story.sections ?? []) {
    add(section.cover);
    section.items?.forEach((item) => add(item.photo));
    section.photos?.forEach(add);
    section.groups?.forEach((group) => group.photos?.forEach(add));
    add(section.handwriting);
  }
  return map;
}

/** rotate + resize 后取 raw 像素，避免重复解码，也拿到真实宽高 */
async function loadRaster(src: string, resize: sharp.ResizeOptions): Promise<Raster> {
  const { data, info } = await sharp(src)
    .rotate()
    .resize(resize)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    image: sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }),
    width: info.width,
    height: info.height,
  };
}

/** 调色结果固化一次，三档输出共用同一份像素 */
async function materialize(pipeline: sharp.Sharp): Promise<sharp.Sharp> {
  const { data, info } = await pipeline
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function labelSvg(key: LookKey, isDefault: boolean): Buffer {
  const { height, padding, fontSize, background, ink } = SHEET.label;
  const text = isDefault ? `${LOOKS[key]} · ${LOOKS_SHEET.defaultMark}` : LOOKS[key];
  const boxWidth = Math.min(SHEET.width / SHEET.columns - padding * 2, padding * 2 + text.length * fontSize);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SHEET.width / SHEET.columns}" height="${height}">`,
    `<rect x="${padding}" y="${padding}" width="${boxWidth}" height="${fontSize + padding}" rx="6" fill="${background}" fill-opacity="0.82"/>`,
    `<text x="${padding * 2}" y="${padding + fontSize + 4}" font-family="'Noto Sans CJK SC','PingFang SC','Microsoft YaHei',sans-serif" font-size="${fontSize}" fill="${ink}">${escapeXml(text)}</text>`,
    "</svg>",
  ].join("");
  return Buffer.from(svg);
}

async function processImage(
  src: string,
  outDir: string,
  key: string,
  look: LookKey,
  withCover: boolean,
): Promise<ManifestEntry> {
  const raster = await loadRaster(src, {
    width: MAX_EDGE,
    height: MAX_EDGE,
    fit: "inside",
    withoutEnlargement: true,
  });
  const normalized = await normalizeExposure(raster.image, raster.width, raster.height);
  const looked = await applyLook(normalized, look, raster.width, raster.height);
  const styled = await materialize(looked);

  await Promise.all([
    styled.clone().avif({ quality: 52, effort: 6 }).toFile(path.join(outDir, `${key}-lg.avif`)),
    styled.clone().webp({ quality: 60 }).toFile(path.join(outDir, `${key}-lg.webp`)),
    styled.clone().jpeg({ quality: 60, mozjpeg: true }).toFile(path.join(outDir, `${key}-lg.jpg`)),
    styled
      .clone()
      .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 60 })
      .toFile(path.join(outDir, `${key}-md.webp`)),
    styled
      .clone()
      .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 60 })
      .toFile(path.join(outDir, `${key}-sm.webp`)),
  ]);

  if (withCover) {
    await styled
      .clone()
      .resize({ width: 1200, height: 630, fit: "cover", position: "top" })
      .jpeg({ quality: 72, mozjpeg: true })
      .toFile(path.join(outDir, "cover-og.jpg"));
  }

  const tiny = await styled
    .clone()
    .resize({ width: 20, height: 20, fit: "inside" })
    .webp({ quality: 30 })
    .toBuffer();

  const stat = fs.statSync(src);
  return {
    w: raster.width,
    h: raster.height,
    lqip: `data:image/webp;base64,${tiny.toString("base64")}`,
    v: `${Math.round(stat.mtimeMs).toString(36)}-${stat.size.toString(36)}-${look}`,
  };
}

/** 手写签名：黑墨 mask 转 alpha，输出透明底墨色 PNG */
async function buildSignature(rawDir: string, outDir: string): Promise<boolean> {
  const src = path.join(rawDir, "signature.jpg");
  if (!fs.existsSync(src)) return false;

  const mask = await sharp(src)
    .rotate()
    .flatten({ background: "#FFFFFF" })
    .grayscale()
    .normalise()
    .threshold(170)
    .negate()
    .png()
    .toBuffer({ resolveWithObject: true });

  await sharp({
    create: {
      width: mask.info.width,
      height: mask.info.height,
      channels: 3,
      background: SIGNATURE_INK,
    },
  })
    .joinChannel(mask.data)
    .png()
    .toFile(path.join(outDir, SIGNATURE_FILE));

  return true;
}

/** 同一张封面跑六种配方，3×2 拼成对比图 */
async function buildLooksSheet(src: string, outFile: string, defaultLook: LookKey): Promise<void> {
  const cellWidth = Math.floor(SHEET.width / SHEET.columns);
  const cellHeight = Math.floor(SHEET.height / (LOOK_KEYS.length / SHEET.columns));
  const raster = await loadRaster(src, { width: cellWidth, height: cellHeight, fit: "cover" });
  const normalized = await normalizeExposure(raster.image, raster.width, raster.height);

  const overlays: sharp.OverlayOptions[] = [];
  const labels: sharp.OverlayOptions[] = [];
  LOOK_KEYS.forEach((key, index) => {
    const left = (index % SHEET.columns) * cellWidth;
    const top = Math.floor(index / SHEET.columns) * cellHeight;
    labels.push({ input: labelSvg(key, key === defaultLook), left, top });
  });

  const tiles = await Promise.all(
    LOOK_KEYS.map(async (key) => {
      const looked = await applyLook(normalized.clone(), key, raster.width, raster.height);
      return looked.png().toBuffer();
    }),
  );
  tiles.forEach((buffer, index) => {
    overlays.push({
      input: buffer,
      left: (index % SHEET.columns) * cellWidth,
      top: Math.floor(index / SHEET.columns) * cellHeight,
    });
  });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await sharp({
    create: {
      width: SHEET.width,
      height: SHEET.height,
      channels: 3,
      background: "#FBF7F0",
    },
  })
    .composite([...overlays, ...labels])
    .jpeg({ quality: SHEET.quality, mozjpeg: true })
    .toFile(outFile);
}

async function main(): Promise<void> {
  const slug = arg("slug");
  if (!slug || !SLUG_RE.test(slug)) {
    throw new Error("用法：pnpm assets --slug=bb-20250417 [--look=warm]");
  }
  const override = arg("look");
  if (override !== undefined && !isLookKey(override)) {
    throw new Error(`--look 只能是：${LOOK_KEYS.join(" / ")}`);
  }

  const root = process.cwd();
  const orderDir = path.join(root, "content", "orders", slug);
  const rawDir = path.join(orderDir, "raw");
  const outDir = path.join(root, "public", "orders", slug);
  const storyPath = path.join(orderDir, "story.json");
  if (!fs.existsSync(rawDir)) {
    throw new Error(`找不到原始素材目录：${rawDir}`);
  }
  if (!fs.existsSync(storyPath)) {
    throw new Error(`找不到 story.json：${storyPath}`);
  }

  const story = JSON.parse(fs.readFileSync(storyPath, "utf8")) as StoryFile;
  const meta: StoryMeta = story.meta ?? {};
  story.meta = meta;

  const metaLook = asLook(meta.look) ?? "warm";
  const look: LookKey = override ?? metaLook;
  let dirty = false;
  if (override !== undefined && meta.look !== override) {
    meta.look = override;
    dirty = true;
  }

  const lookByFile = collectLooks(story, look);
  const hero = (story.sections ?? []).find((section) => section.kind === "hero");

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(rawDir).filter((file) => IMAGE_RE.test(file));
  const photoFiles = files.filter((file) => keyOf(file) !== "signature").sort();
  const manifest: Record<string, ManifestEntry> = {};

  for (const file of photoFiles) {
    const key = keyOf(file);
    if (!key) continue;
    const photoLook = lookByFile.get(file) ?? look;
    manifest[key] = await processImage(
      path.join(rawDir, file),
      outDir,
      key,
      photoLook,
      key === "cover",
    );
    console.log(`✓ ${file} → ${key} · ${photoLook}`);
  }

  const signature = await buildSignature(rawDir, outDir);
  if (signature && !meta.signature) {
    meta.signature = SIGNATURE_FILE;
    dirty = true;
  }

  const bgm = path.join(rawDir, "bgm.mp3");
  if (fs.existsSync(bgm)) {
    fs.copyFileSync(bgm, path.join(outDir, "bgm.mp3"));
    const size = fs.statSync(bgm).size;
    if (size > 2.5 * 1024 * 1024) {
      console.warn(`! bgm.mp3 超过 2.5MB（${humanSize(size)}），请压缩`);
    }
  }

  fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(
    path.join(outDir, "look.json"),
    `${JSON.stringify(
      {
        look,
        recipeVersion: LOOK_RECIPE_VERSION,
        generatedAt: new Date().toISOString().slice(0, 10),
      },
      null,
      2,
    )}\n`,
  );

  if (dirty) {
    fs.writeFileSync(storyPath, `${JSON.stringify(story, null, 2)}\n`);
  }

  const coverFile =
    photoFiles.find((file) => file === hero?.cover?.src) ??
    photoFiles.find((file) => keyOf(file) === "cover") ??
    photoFiles[0];
  let sheetPath = "";
  if (coverFile) {
    sheetPath = path.join(root, "out", slug, "looks-sheet.jpg");
    await buildLooksSheet(path.join(rawDir, coverFile), sheetPath, look);
  } else {
    console.warn("! raw/ 里没有可用封面图，跳过对比图");
  }

  const total = fs
    .readdirSync(outDir)
    .map((file) => fs.statSync(path.join(outDir, file)).size)
    .reduce((sum, size) => sum + size, 0);
  console.log(`\n图片 ${photoFiles.length} 张，输出目录合计 ${humanSize(total)}`);
  console.log(`look: ${look} · recipeVersion: ${LOOK_RECIPE_VERSION}`);
  console.log(`签名图: ${signature ? `已生成 ${SIGNATURE_FILE}` : "raw/ 无 signature.jpg，跳过"}`);
  if (sheetPath) {
    console.log(`对比图（${LOOKS_SHEET.title}）：${path.relative(root, sheetPath)}`);
  }
  if (total > 3.5 * 1024 * 1024) {
    console.warn("! 单页图片总量超过 3.5MB 预算");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
