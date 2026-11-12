/**
 * 体积报告（DEV_SPEC 11.1 / 19.2）
 * 用法：pnpm build && pnpm budget
 *
 * 读取 next build 的 app-build-manifest，只统计 /s/[slug] 首屏实际加载的
 * JS / CSS（gzip），避免把全站所有路由的 chunk 都算进单页预算。
 */
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

interface BuildManifest {
  pages: Record<string, string[]>;
}

const KB = 1024;
const PAGE_KEY = "/s/[slug]/page";

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function gz(files: string[], suffix: string): number {
  return files
    .filter((file) => file.endsWith(suffix))
    .reduce((total, file) => total + gzipSync(fs.readFileSync(file)).length, 0);
}

function kb(bytes: number): string {
  return `${(bytes / KB).toFixed(1)}KB`;
}

function line(label: string, bytes: number, budget: number): string {
  const ok = bytes <= budget;
  return `${label}: ${kb(bytes)} / 预算 ${kb(budget)} ${ok ? "✓" : "✗"}`;
}

const root = process.cwd();
const manifestPath = path.join(root, ".next", "app-build-manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.warn("! 还没有 .next/app-build-manifest.json，先运行 pnpm build");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as BuildManifest;
const pageFiles = manifest.pages[PAGE_KEY];
if (!pageFiles) {
  console.warn(`! app-build-manifest 里找不到 ${PAGE_KEY}，先运行 pnpm build`);
  process.exit(1);
}

const files = [...new Set(pageFiles)].map((file) => path.join(root, ".next", file));
const jsGzip = gz(files, ".js");
const cssFiles = walk(path.join(root, ".next", "static", "css"));
const cssGzip = gz(cssFiles, ".css");

const images = walk(path.join(root, "public", "orders")).filter((file) =>
  /\.(avif|webp|jpe?g|png|mp3)$/i.test(file),
);
const imageTotal = images.reduce((total, file) => total + fs.statSync(file).size, 0);

console.log("— 体积报告（/s/[slug] 首屏，gzip）—");
console.log(line("单页 JS ", jsGzip, 150 * KB));
console.log(line("首屏 CSS", cssGzip, 30 * KB));
console.log(`图片总量: ${kb(imageTotal)} / 预算 3.5MB ${imageTotal > 3.5 * 1024 * KB ? "✗" : "✓"}`);

if (jsGzip > 150 * KB || cssGzip > 30 * KB) process.exitCode = 1;
