/**
 * 生成传播版 PDF（DEV_SPEC 20.11）。
 * 用法：pnpm pdf --slug=bb-20250417 [--base=http://localhost:3000]
 *
 * 前置：dev server 或 start 已运行；`.env.local` 内有 PREVIEW_SECRET。
 * 输出：out/{slug}/{小名}的一周岁.pdf
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const MAX_BYTES = 8 * 1024 * 1024;
const EXPECTED_PAGES = 12;

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

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.slug;
  if (!slug) {
    console.error("缺少 --slug，例如：pnpm pdf --slug=bb-20250417");
    process.exit(1);
  }

  const env = readEnvFile(path.resolve(process.cwd(), ".env.local"));
  const secret = process.env.PREVIEW_SECRET ?? env.PREVIEW_SECRET;
  if (!secret) {
    console.error("缺少 PREVIEW_SECRET（.env.local 或环境变量）");
    process.exit(1);
  }

  const port = process.env.PORT ?? env.PORT ?? "3000";
  const base =
    args.base ?? process.env.PREVIEW_BASE ?? env.PREVIEW_BASE ?? `http://localhost:${port}`;

  const contentDir = process.env.CONTENT_DIR ?? env.CONTENT_DIR ?? "content/orders";
  const storyFile = path.resolve(process.cwd(), contentDir, slug, "story.json");
  if (!fs.existsSync(storyFile)) {
    console.error(`找不到订单：${storyFile}`);
    process.exit(1);
  }
  const story = JSON.parse(fs.readFileSync(storyFile, "utf8")) as {
    sections?: Array<{ kind?: string; name?: string }>;
  };
  const hero = story.sections?.find((section) => section.kind === "hero");
  const name = cleanName(hero?.name ?? "");

  const outDir = path.resolve(process.cwd(), "out", slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${name}的一周岁.pdf`);

  const url = `${base}/pdf/${slug}?token=${encodeURIComponent(secret)}`;
  console.log(`打开 ${base}/pdf/${slug}`);

  console.log("启动 Chromium…");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    console.log("页面已加载，等待 12 页与图片…");
    await page.waitForSelector('[data-page="12"]', { timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const images = Array.from(document.images);
      images.forEach((image) => {
        image.loading = "eager";
      });
      await Promise.all(
        images.map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }),
        ),
      );
    });

    const pdfBuffer = await page.pdf({
      width: "1080px",
      height: "1920px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    await page.close();
    try {
      fs.writeFileSync(outFile, pdfBuffer);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "EACCES") throw error;
      const altFile = path.join(outDir, `${name}的一周岁-新.pdf`);
      fs.writeFileSync(altFile, pdfBuffer);
      console.warn(`原文件被占用，已改为写入 ${altFile}`);
    }
  } finally {
    await browser.close();
  }

  const written = fs.existsSync(outFile) && fs.statSync(outFile).mtimeMs > Date.now() - 60_000
    ? outFile
    : path.join(outDir, `${name}的一周岁-新.pdf`);
  const bytes = fs.readFileSync(written);
  const latin1 = bytes.toString("latin1");
  const counts = [...latin1.matchAll(/\/Type\s*\/Pages[\s\S]{0,200}?\/Count\s+(\d+)/g)].map((match) =>
    Number(match[1]),
  );
  const pageCount = counts.length > 0 ? Math.max(...counts) : 0;
  const hasFont = latin1.includes("/Font");
  const mediaBox = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(latin1);

  console.log(`已生成 ${written}`);
  console.log(`体积 ${kb(bytes.length)} / 上限 ${kb(MAX_BYTES)}`);
  console.log(`页数 ${pageCount} / 预期 ${EXPECTED_PAGES}`);
  if (mediaBox) console.log(`页面尺寸 ${mediaBox[1]} × ${mediaBox[2]} pt`);
  console.log(`嵌入字体 ${hasFont ? "是" : "否"}`);

  const problems: string[] = [];
  if (bytes.length > MAX_BYTES) problems.push(`体积超过 8MB（${kb(bytes.length)}）`);
  if (pageCount !== EXPECTED_PAGES) problems.push(`页数不是 ${EXPECTED_PAGES}`);
  if (!hasFont) problems.push("未检测到嵌入字体，文字可能不可选中");

  if (problems.length > 0) {
    for (const problem of problems) console.error(`失败：${problem}`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
