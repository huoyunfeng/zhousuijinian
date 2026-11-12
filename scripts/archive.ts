/**
 * 到期归档（DEV_SPEC 18 / 19.3）
 * 用法：pnpm archive            处理所有已过 expiresAt 的订单
 *       pnpm archive --slug=xx  只处理指定订单
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function arg(name: string): string | undefined {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function expired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return expiresAt < todayISO();
}

function main(): void {
  const root = process.cwd();
  const contentDir = path.resolve(root, process.env.CONTENT_DIR ?? "content/orders");
  const publicRoot = path.resolve(root, process.env.PUBLIC_DIR ?? "public/orders");
  const archiveDir = path.resolve(root, process.env.ARCHIVE_DIR ?? "archive");
  fs.mkdirSync(archiveDir, { recursive: true });

  const only = arg("slug");
  const slugs = fs.existsSync(contentDir)
    ? fs.readdirSync(contentDir).filter((name) => fs.statSync(path.join(contentDir, name)).isDirectory())
    : [];

  const stamp = todayISO();
  for (const slug of slugs) {
    if (only && slug !== only) continue;
    const storyFile = path.join(contentDir, slug, "story.json");
    if (!fs.existsSync(storyFile)) continue;
    const story = JSON.parse(fs.readFileSync(storyFile, "utf8")) as {
      access?: { expiresAt?: string };
    };
    if (!only && !expired(story.access?.expiresAt)) continue;

    const archiveName = `${slug}-${stamp}.tar.gz`;
    const archivePath = path.join(archiveDir, archiveName);
    const result = spawnSync(
      "tar",
      ["-czf", archivePath, path.join("content", "orders", slug), path.join("public", "orders", slug)],
      { cwd: root, stdio: "inherit" },
    );
    if (result.status !== 0) {
      console.error(`! 归档失败：${slug}`);
      continue;
    }
    fs.rmSync(path.join(publicRoot, slug), { recursive: true, force: true });
    console.log(`✓ ${slug} → archive/${archiveName}，已删除 public 资源`);
  }
}

main();
