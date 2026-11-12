import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { prisma } from "./db";
import { ADMIN } from "./copy";
import { publicOrderDir } from "./story";
import { shanghaiToday } from "./date";

/** 打包归档并下线 public 资源（DEV_SPEC 18） */
export async function archiveOrder(slug: string): Promise<{ archivePath: string }> {
  const root = process.cwd();
  const archiveDir = path.resolve(root, process.env.ARCHIVE_DIR ?? "archive");
  fs.mkdirSync(archiveDir, { recursive: true });

  const fileName = `${slug}-${shanghaiToday()}.tar.gz`;
  const archivePath = path.join(archiveDir, fileName);

  const result = spawnSync(
    "tar",
    ["-czf", archivePath, path.join("content", "orders", slug), path.join("public", "orders", slug)],
    { cwd: root, stdio: "ignore" },
  );

  if (result.status !== 0) {
    throw new Error(ADMIN.detail.delivery.archiveFailed);
  }

  fs.rmSync(publicOrderDir(slug), { recursive: true, force: true });

  await prisma.order.update({
    where: { slug },
    data: { status: "archived", archivedAt: new Date() },
  });

  return { archivePath };
}
