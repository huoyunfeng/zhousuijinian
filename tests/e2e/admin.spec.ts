import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { ADMIN } from "../../lib/copy";

process.env.DATABASE_URL ??= "file:./dev.db";

const prisma = new PrismaClient();
const STATE_FILE = path.join(os.tmpdir(), "yizhouji-admin-state.json");
const orderSlug = `e2e-${Date.now()}`;
const babyName = "端到端";
let createdSlug = "";

// 先放一个空 state，避免 context 创建早于 beforeAll 时读文件失败
fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
if (!fs.existsSync(STATE_FILE)) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({ cookies: [], origins: [] }), "utf8");
}

test.use({ storageState: STATE_FILE });

function envValue(key: string): string {
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;
  const file = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return "";
  const line = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : "";
}

test.beforeAll(async () => {
  const response = await fetch("http://127.0.0.1:3000/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // 每次运行换一个来源 IP，避免命中后台登录 3 次/5 分钟的限流桶
      "X-Forwarded-For": `10.9.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
    },
    body: JSON.stringify({ password: envValue("ADMIN_PASSWORD") }),
  });
  expect(response.ok).toBeTruthy();

  const setCookie = response.headers.get("set-cookie") ?? "";
  const pair = setCookie.split(";")[0] ?? "";
  const index = pair.indexOf("=");
  const name = pair.slice(0, index);
  const value = pair.slice(index + 1);
  const state = {
    cookies: [
      {
        name,
        value,
        domain: "127.0.0.1",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state), "utf8");
});

test.afterAll(async () => {
  await prisma.order.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.$disconnect();
  for (const dir of [
    path.resolve(process.cwd(), "content/orders", createdSlug || orderSlug),
    path.resolve(process.cwd(), "public/orders", createdSlug || orderSlug),
  ]) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    } catch {
      // Windows 下 dev server 可能仍持有句柄，下次运行前由脚本清理
    }
  }
  fs.rmSync(STATE_FILE, { force: true });
});

test.describe.configure({ mode: "serial" });

test("E8 后台建单：订单出现在列表、状态为 draft、预览可打开", async ({ page, request }) => {
  test.setTimeout(180_000);

  const created = await request.post("/api/admin/orders", {
    data: {
      babyName,
      birthday: "2026-01-01",
      slug: orderSlug,
      theme: "paper-warm",
      tier: "basic",
      password: "0101",
      deposit: 100,
    },
  });
  expect(created.status()).toBe(201);
  const payload = (await created.json()) as { data?: { slug?: string } };
  expect(payload.data?.slug).toBe(orderSlug);
  createdSlug = orderSlug;

  await page.goto("/admin/orders");
  const row = page.locator("tr", { hasText: babyName });
  await expect(row).toBeVisible();
  await expect(row.locator(".status-tag")).toHaveText(ADMIN.statusLabels.draft);

  await page.goto(`/s/${orderSlug}?preview=1`);
  await expect(page.locator("body")).toContainText(babyName);
});

test("E15 paid 不能直接跳到 delivered", async ({ request }) => {
  expect(createdSlug).toBeTruthy();

  const paid = await request.patch(`/api/admin/orders/${createdSlug}`, {
    data: { status: "paid" },
  });
  expect(paid.ok()).toBeTruthy();

  const rejected = await request.patch(`/api/admin/orders/${createdSlug}`, {
    data: { status: "delivered" },
  });
  expect(rejected.status()).toBe(422);
  const payload = (await rejected.json()) as { error?: { message?: string } };
  expect(payload.error?.message).toBe(ADMIN.detail.basic.deliverBlocked);
});
