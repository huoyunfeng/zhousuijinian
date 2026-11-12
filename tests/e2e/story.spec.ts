import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import {
  EXPIRED_SLUG,
  LIMIT_SLUG,
  MISSING_MONTHS_SLUG,
  SAMPLE_PASSWORD,
  SAMPLE_SLUG,
  accessOf,
  removeStory,
  sampleFutureBody,
  sampleLetterBody,
  section,
  writeStory,
} from "./fixtures";

const SECTION_IDS = ["top", "months", "growth", "zhuazhou", "gallery", "letter", "future", "bless", "end"];

async function unlock(page: Page, slug: string, password: string): Promise<void> {
  const response = await page.request.post("/api/unlock", { data: { slug, password } });
  expect(response.ok()).toBeTruthy();
}

test.beforeAll(() => {
  writeStory(LIMIT_SLUG, (data) => {
    accessOf(data).password = "9999";
  });
  writeStory(EXPIRED_SLUG, (data) => {
    accessOf(data).expiresAt = "2020-01-01";
  });
  writeStory(MISSING_MONTHS_SLUG, (data) => {
    const timeline = section(data, "timeline12");
    const items = timeline.items as Array<Record<string, unknown>>;
    timeline.items = items.filter((item) => ![4, 7, 12].includes(Number(item.month)));
  });
});

test.afterAll(() => {
  for (const slug of [LIMIT_SLUG, EXPIRED_SLUG, MISSING_MONTHS_SLUG]) removeStory(slug);
});

test("E1 未登录只看到密码页，HTML 不含信件正文", async ({ page }) => {
  await page.goto(`/s/${SAMPLE_SLUG}`);
  await expect(page).toHaveURL(new RegExp(`/gate/${SAMPLE_SLUG}`));
  await expect(page.locator("#gate-password")).toBeVisible();

  const html = await page.content();
  expect(html).not.toContain(sampleFutureBody());
  expect(html).not.toContain(sampleLetterBody());
});

test("E3 正确密码后九章齐全（含 E4 未来信锁定、E6 灯箱、E7 抓周）", async ({ page, browserName }) => {
  await unlock(page, SAMPLE_SLUG, SAMPLE_PASSWORD);
  await page.goto(`/s/${SAMPLE_SLUG}`);
  await expect(page).toHaveURL(new RegExp(`/s/${SAMPLE_SLUG}$`));

  for (const id of SECTION_IDS) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }

  const future = page.locator("#future");
  await future.scrollIntoViewIfNeeded();
  await expect(future.locator(".fl__count")).toBeVisible();
  expect(await page.content()).not.toContain(sampleFutureBody());

  const firstPhoto = page.locator(".gallery__item").first();
  await firstPhoto.scrollIntoViewIfNeeded();
  await firstPhoto.click();
  await expect(page.locator(".lightbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".lightbox")).toHaveCount(0);
  // iOS Safari 点击按钮不会让它获得焦点，焦点还原只在桌面端断言
  if (browserName !== "webkit") await expect(firstPhoto).toBeFocused();

  const firstItem = page.locator(".zz__item").first();
  await firstItem.scrollIntoViewIfNeeded();
  await firstItem.click();
  await expect(page.locator(".zz__result")).toBeVisible();
  await page.locator(".zz__result button").first().click();
  await expect(page.locator(".zz__result")).toHaveCount(0);
});

test("E14 分享卡片：og:image 为 1200×630，标题不超过 15 字", async ({ page, request }) => {
  await unlock(page, SAMPLE_SLUG, SAMPLE_PASSWORD);
  await page.goto(`/s/${SAMPLE_SLUG}`);

  const title = await page.title();
  expect(title.length).toBeLessThanOrEqual(15);

  const image = await request.get(`/orders/${SAMPLE_SLUG}/cover-og.jpg`);
  expect(image.status()).toBe(200);
  const meta = await sharp(Buffer.from(await image.body())).metadata();
  expect(meta.width).toBe(1200);
  expect(meta.height).toBe(630);
});

test("E11 缺月数据渲染虚线占位且不报错", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await unlock(page, MISSING_MONTHS_SLUG, SAMPLE_PASSWORD);
  const response = await page.goto(`/s/${MISSING_MONTHS_SLUG}`);
  expect(response?.status()).toBe(200);
  await expect(page.locator(".timeline__placeholder")).toHaveCount(3);
  expect(errors).toEqual([]);
});

test("E9 过期订单返回 410 归档页", async ({ request }) => {
  const first = await request.get(`/s/${EXPIRED_SLUG}`, { maxRedirects: 0 });
  expect([307, 308]).toContain(first.status());
  expect(first.headers()["location"]).toContain(`/s/${EXPIRED_SLUG}/expired`);

  const expired = await request.get(`/s/${EXPIRED_SLUG}/expired`);
  expect(expired.status()).toBe(410);
  expect(await expired.text()).toContain("已归档");
});

test("E2 连续输错 5 次后锁定 60 秒", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "同一服务端限流桶在两个 project 间共享");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await page.request.post("/api/unlock", {
      data: { slug: LIMIT_SLUG, password: "1111" },
    });
    expect(response.status()).toBe(401);
  }

  await page.goto(`/s/${LIMIT_SLUG}`);
  await expect(page.locator("#gate-password")).toBeVisible();
  await page.locator("#gate-password").fill("9999");
  await expect(page.locator(".gate__error")).toContainText("60");
});
