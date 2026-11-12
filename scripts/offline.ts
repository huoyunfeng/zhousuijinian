/**
 * 生成单文件离线包（DEV_SPEC 20.3 / 20.4 / 20.6 / 20.7）。
 * 用法：pnpm offline --slug=bb-20250417 [--version=1] [--base=http://localhost:3000]
 *
 * 输出：out/offline/{slug}/{小名}的一周岁.html
 */
import fs from "node:fs";
import path from "node:path";

const SOFT_LIMIT = 12 * 1024 * 1024;
const HARD_LIMIT = 20 * 1024 * 1024;

function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const body = item.slice(2);
    const eq = body.indexOf("=");
    if (eq >= 0) {
      result[body.slice(0, eq)] = body.slice(eq + 1);
    } else {
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        result[body] = next;
        index += 1;
      }
    }
  }
  return result;
}

function readEnvFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const result: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function cleanName(name: string): string {
  const cleaned = name
    .replace(/[\s()[\]{}<>:"/\\|?*]/g, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .trim();
  return cleaned || "宝宝";
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

function dotted(date: string): string {
  return date.replace(/-/g, ".");
}

interface StoryShape {
  sections?: Array<{ kind?: string; name?: string; body?: string; unlockAt?: string }>;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.slug;
  if (!slug) {
    console.error("缺少 --slug，例如：pnpm offline --slug=bb-20250417");
    process.exit(1);
  }

  const env = readEnvFile(path.resolve(process.cwd(), ".env.local"));
  const secret = process.env.PREVIEW_SECRET ?? env.PREVIEW_SECRET;
  if (!secret) {
    console.error("缺少 PREVIEW_SECRET（.env.local 或环境变量）");
    process.exit(1);
  }

  const version = Number(args.version ?? "1");
  const port = process.env.PORT ?? env.PORT ?? "3000";
  const base =
    args.base ?? process.env.PREVIEW_BASE ?? env.PREVIEW_BASE ?? `http://localhost:${port}`;

  const contentDir = process.env.CONTENT_DIR ?? env.CONTENT_DIR ?? "content/orders";
  const storyFile = path.resolve(process.cwd(), contentDir, slug, "story.json");
  if (!fs.existsSync(storyFile)) {
    console.error(`找不到订单：${storyFile}`);
    process.exit(1);
  }
  const story = JSON.parse(fs.readFileSync(storyFile, "utf8")) as StoryShape;
  const hero = story.sections?.find((section) => section.kind === "hero");
  const future = story.sections?.find((section) => section.kind === "futureLetter");
  const name = cleanName(hero?.name ?? "");

  const url = `${base}/offline/${slug}?token=${encodeURIComponent(secret)}&v=${version}`;
  console.log(`拉取 ${base}/offline/${slug}`);
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`构建失败：HTTP ${response.status}`);
    process.exit(1);
  }
  const html = await response.text();

  const outDir = path.resolve(process.cwd(), "out", "offline", slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${name}的一周岁.html`);
  fs.writeFileSync(outFile, html, "utf8");

  const bytes = Buffer.byteLength(html);
  const imageBytes = Number(response.headers.get("X-Offline-Image-Bytes") ?? "0");
  const audioBytes = Number(response.headers.get("X-Offline-Audio-Bytes") ?? "0");
  const hasAudio = response.headers.get("X-Offline-Audio") === "1";
  const quality = response.headers.get("X-Offline-Quality") ?? "unknown";

  console.log(`已生成 ${outFile}`);
  console.log(`总大小 ${mb(bytes)}（软上限 ${mb(SOFT_LIMIT)}，硬上限 ${mb(HARD_LIMIT)}）`);
  console.log(
    `图片 ${mb(imageBytes)} / 音频 ${hasAudio ? mb(audioBytes) : "未包含"} / 压缩 ${quality}`,
  );
  console.log(`HTML+CSS+JS ${mb(bytes - imageBytes - audioBytes)}`);

  const problems: string[] = [];
  if (bytes > HARD_LIMIT) problems.push(`总大小超过硬上限 20MB（${mb(bytes)}）`);
  if (imageBytes > 6 * 1024 * 1024) problems.push(`图片超过 6MB（${mb(imageBytes)}）`);
  if (html.includes("http://") || html.includes("https://")) problems.push("发现外部链接");
  if (html.includes('<script type="module"')) problems.push("含 ES module 脚本");
  if (!html.includes("window.__STORY__")) problems.push("缺少内联数据 window.__STORY__");
  if (future?.body) {
    const body = future.body.replace(/\s+/g, "");
    const text = html.replace(/\s+/g, "");
    if (body.length > 0 && text.includes(body)) problems.push("未来信正文泄露");
  }
  if (future?.unlockAt && !html.includes(dotted(future.unlockAt))) problems.push("缺少未来信解锁日期");
  if (!html.includes(`第 ${version} 版`)) problems.push("页脚缺少版本号");
  if (!html.includes("生成于")) problems.push("页脚缺少生成日期");

  if (bytes > SOFT_LIMIT) console.warn(`警告：总大小超过 12MB 软上限（${mb(bytes)}）`);

  if (problems.length > 0) {
    for (const problem of problems) console.error(`失败：${problem}`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
