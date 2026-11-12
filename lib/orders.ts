import fs from "node:fs";
import path from "node:path";
import { formatInTimeZone } from "date-fns-tz";
import type { Order } from "@prisma/client";
import { prisma } from "./db";
import { ADMIN, VALIDATION, ZHUAZHOU_DEFAULT } from "./copy";
import { anniversaryDate, dottedDate, shanghaiToday } from "./date";
import { orderDir, loadManifest, publicOrderDir, storyPath } from "./story";
import { storySchema, type ParsedStory } from "./schema";
import { generatePlaceholders } from "./placeholders";
import { processOrderAssets } from "./pipeline";
import { writeQr } from "./qr";
import { normalize as normalizeStory } from "./story";
import { isTheme, isThemeKey } from "./theme";
import type { OrderStatus, Story, ThemeKey } from "./types";

export interface CreateOrderInput {
  babyName: string;
  birthday: string;
  slug?: string;
  theme?: string;
  password?: string;
  tier?: string;
  deposit?: number;
}

export interface AdminOrder {
  slug: string;
  status: OrderStatus;
  babyName: string;
  birthday: string;
  theme: ThemeKey;
  tier: string;
  amount: number;
  depositPaid: number;
  finalPaid: number;
  contact: string;
  note: string;
  revisions: number;
  deliveredAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const TIER_AMOUNT: Record<string, number> = { basic: 39900, plus: 59900 };

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(VALIDATION.dateFormat);
  const date = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) throw new Error(VALIDATION.dateInvalid);
}

export function defaultSlug(birthday: string): string {
  return `bb-${birthday.replaceAll("-", "")}`;
}

export function toAdminOrder(order: Order): AdminOrder {
  return {
    slug: order.slug,
    status: order.status as OrderStatus,
    babyName: order.babyName,
    birthday: formatInTimeZone(order.birthday, "Asia/Shanghai", "yyyy-MM-dd"),
    theme: isTheme(order.theme) ? order.theme : "paper-warm",
    tier: order.tier,
    amount: order.amount,
    depositPaid: order.depositPaid,
    finalPaid: order.finalPaid,
    contact: order.contact ?? "",
    note: order.note ?? "",
    revisions: order.revisions,
    deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
    archivedAt: order.archivedAt ? order.archivedAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function daysToBirthday(birthday: string): number {
  const today = shanghaiToday();
  const target = anniversaryDate(birthday, 1);
  const diff = Date.UTC(
    Number(target.slice(0, 4)),
    Number(target.slice(5, 7)) - 1,
    Number(target.slice(8, 10)),
  ) - Date.UTC(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)) - 1,
    Number(today.slice(8, 10)),
  );
  return Math.round(diff / 86_400_000);
}

function buildDefaultStory(input: {
  slug: string;
  babyName: string;
  birthday: string;
  theme: ThemeKey;
  password: string;
}) {
  const { slug, babyName, birthday, theme, password } = input;
  const today = shanghaiToday();
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      month,
      photo: {
        src: `m${String(month).padStart(2, "0")}.jpg`,
        alt: ADMIN.defaults.monthNote(month),
        ratio: "4:5",
      },
      note: ADMIN.defaults.monthNote(month),
      date: "",
    };
  });

  return {
    slug,
    kind: "baby_first_birthday" as const,
    theme,
    meta: {
      title: `${babyName}的一周岁`,
      description: `${babyName}的一周岁纪念页，写给未来的每一天。`,
    },
    access: {
      mode: "password" as const,
      password,
      expiresAt: anniversaryDate(birthday, 3),
      noindex: true,
    },
    sections: [
      {
        id: "hero",
        kind: "hero" as const,
        enabled: true,
        name: babyName,
        tagline: ADMIN.defaults.tagline,
        birthday,
        cover: { src: "cover.jpg", alt: `${babyName}的封面`, ratio: "4:5" as const },
        showAge: true,
      },
      { id: "months", kind: "timeline12" as const, enabled: true, items: months },
      { id: "growth", kind: "growth" as const, enabled: true, points: [] },
      { id: "zhuazhou", kind: "zhuazhou" as const, enabled: true, items: ZHUAZHOU_DEFAULT.map((item) => ({ ...item })) },
      {
        id: "gallery",
        kind: "gallery" as const,
        enabled: true,
        photos: Array.from({ length: 6 }, (_, index) => ({
          src: `p0${index + 1}.jpg`,
          alt: "",
          ratio: "4:5" as const,
        })),
      },
      {
        id: "letter",
        kind: "letter" as const,
        enabled: true,
        from: ADMIN.defaults.letterFrom,
        to: babyName,
        body: ADMIN.defaults.letterBody,
      },
      {
        id: "future",
        kind: "futureLetter" as const,
        enabled: true,
        title: ADMIN.defaults.futureTitle,
        unlockAt: anniversaryDate(birthday, 18),
        body: ADMIN.defaults.futureBody,
        from: ADMIN.defaults.letterFrom,
        writtenAt: `${dottedDate(today)} ${ADMIN.defaults.writtenSuffix}`,
      },
      { id: "bless", kind: "guestbook" as const, enabled: false, messages: [] },
      {
        id: "end",
        kind: "outro" as const,
        enabled: true,
        thanks: ADMIN.defaults.outroThanks,
        signature: ADMIN.defaults.outroSignature(babyName),
        showQr: true,
      },
    ],
  };
}

export async function createOrder(input: CreateOrderInput): Promise<AdminOrder> {
  const babyName = input.babyName.trim();
  if (!babyName || babyName.length > 8) throw new Error(VALIDATION.babyName);
  assertDate(input.birthday);

  const slug = (input.slug?.trim() || defaultSlug(input.birthday)).toLowerCase();
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) throw new Error(VALIDATION.slugInvalid);
  if (fs.existsSync(path.join(orderDir(slug), "story.json"))) throw new Error(VALIDATION.slugExists);

  const password = input.password?.trim() || "0000";
  if (!/^\d{4}$/.test(password)) throw new Error(VALIDATION.password);
  const theme = isThemeKey(input.theme ?? "") ? (input.theme as ThemeKey) : "paper-warm";
  const tier = input.tier === "plus" ? "plus" : "basic";
  const deposit = Math.max(0, Math.round((input.deposit ?? 0) * 100));
  const birthday = input.birthday;

  const raw = buildDefaultStory({ slug, babyName, birthday, theme, password });
  const parsed = storySchema.parse(raw);

  fs.mkdirSync(orderDir(slug), { recursive: true });
  fs.mkdirSync(publicOrderDir(slug), { recursive: true });
  fs.writeFileSync(storyPath(slug), `${JSON.stringify(parsed, null, 2)}\n`, "utf8");

  const order = await prisma.order.create({
    data: {
      slug,
      babyName,
      birthday: new Date(`${birthday}T00:00:00+08:00`),
      theme,
      tier,
      amount: TIER_AMOUNT[tier] ?? TIER_AMOUNT.basic,
      depositPaid: deposit,
      status: "draft",
    },
  });

  try {
    await generatePlaceholders(slug);
    await processOrderAssets(slug);
    await writeQr(slug);
  } catch (error) {
    await prisma.order.delete({ where: { slug } }).catch(() => undefined);
    fs.rmSync(orderDir(slug), { recursive: true, force: true });
    fs.rmSync(publicOrderDir(slug), { recursive: true, force: true });
    throw error;
  }

  return toAdminOrder(order);
}

export async function listOrders(): Promise<AdminOrder[]> {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return orders.map(toAdminOrder);
}

export async function findOrder(slug: string): Promise<AdminOrder | null> {
  const order = await prisma.order.findUnique({ where: { slug } });
  return order ? toAdminOrder(order) : null;
}

export async function orderStats(): Promise<{ month: number; pending: number; overdue: number }> {
  const today = shanghaiToday();
  const monthStart = new Date(
    Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1),
  );
  const all = await prisma.order.findMany();
  const month = all.filter((order) => order.createdAt >= monthStart).length;
  const pending = all.filter((order) => ["paid", "assets", "building", "review"].includes(order.status)).length;
  const overdue = all.filter((order) => {
    if (order.status === "delivered" || order.status === "archived") return false;
    const birthday = formatInTimeZone(order.birthday, "Asia/Shanghai", "yyyy-MM-dd");
    return daysToBirthday(birthday) < 0;
  }).length;
  return { month, pending, overdue };
}

/** 页面用：story 载入失败时返回错误而不是抛 500 */
export function loadStorySafe(slug: string): { ok: true; story: Story } | { ok: false; message: string } {
  try {
    const file = storyPath(slug);
    if (!fs.existsSync(file)) return { ok: false, message: VALIDATION.storyMissing };
    const parsed = storySchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
    return { ok: true, story: normalizeStory(parsed) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : VALIDATION.storyInvalid };
  }
}

/* ---------------------------- 后台编辑（PR7） ---------------------------- */

export interface OrderPatch {
  status?: OrderStatus;
  amount?: number;
  depositPaid?: number;
  finalPaid?: number;
  note?: string;
  contact?: string;
  theme?: ThemeKey;
  revisions?: number;
}

export async function patchOrder(slug: string, patch: OrderPatch): Promise<AdminOrder> {
  const data: {
    status?: string;
    amount?: number;
    depositPaid?: number;
    finalPaid?: number;
    note?: string;
    contact?: string;
    theme?: string;
    revisions?: number;
    deliveredAt?: Date;
    archivedAt?: Date;
  } = {};

  if (patch.status !== undefined) {
    data.status = patch.status;
    if (patch.status === "delivered") data.deliveredAt = new Date();
    if (patch.status === "archived") data.archivedAt = new Date();
  }
  if (patch.amount !== undefined) data.amount = Math.max(0, Math.round(patch.amount));
  if (patch.depositPaid !== undefined) data.depositPaid = Math.max(0, Math.round(patch.depositPaid));
  if (patch.finalPaid !== undefined) data.finalPaid = Math.max(0, Math.round(patch.finalPaid));
  if (patch.note !== undefined) data.note = patch.note.slice(0, 1000);
  if (patch.contact !== undefined) data.contact = patch.contact.slice(0, 200);
  if (patch.theme !== undefined) data.theme = patch.theme;
  if (patch.revisions !== undefined) data.revisions = Math.max(0, Math.round(patch.revisions));

  const order = await prisma.order.update({ where: { slug }, data });
  return toAdminOrder(order);
}

export function readStoryText(slug: string): string | null {
  const file = storyPath(slug);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

function readParsedStory(slug: string): ParsedStory {
  const file = storyPath(slug);
  if (!fs.existsSync(file)) throw new Error(VALIDATION.storyMissing);
  return storySchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
}

function writeParsedStory(slug: string, parsed: ParsedStory): void {
  fs.writeFileSync(storyPath(slug), `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

async function syncOrderMeta(slug: string, parsed: ParsedStory): Promise<void> {
  const hero = parsed.sections.find((section) => section.kind === "hero");
  await prisma.order.update({
    where: { slug },
    data: {
      theme: parsed.theme,
      ...(hero && hero.kind === "hero"
        ? { babyName: hero.name, birthday: new Date(`${hero.birthday}T00:00:00+08:00`) }
        : {}),
    },
  });
}

/** 内容 tab：整份 JSON 保存（Zod 校验通过才落盘），并同步列表用的订单元数据 */
export async function saveStoryJson(slug: string, value: unknown): Promise<AdminOrder> {
  const parsed = storySchema.parse(value);
  if (parsed.slug !== slug) throw new Error(VALIDATION.slugInvalid);
  writeParsedStory(slug, parsed);
  await syncOrderMeta(slug, parsed);
  const order = await prisma.order.findUniqueOrThrow({ where: { slug } });
  return toAdminOrder(order);
}

export async function resetStoryPassword(slug: string, password: string): Promise<void> {
  if (!/^\d{4}$/.test(password)) throw new Error(VALIDATION.password);
  const parsed = readParsedStory(slug);
  writeParsedStory(slug, { ...parsed, access: { ...parsed.access, password } });
}

export async function setStoryTheme(slug: string, theme: ThemeKey): Promise<void> {
  const parsed = readParsedStory(slug);
  writeParsedStory(slug, { ...parsed, theme });
}

export interface AssetCheckItem {
  key: "cover" | "months" | "gallery" | "bgm";
  present: boolean;
  count: number;
  total: number;
}

/** 素材完整性检查（封面 / 12 个月 / 30 张精选 / BGM） */
export function assetChecklist(slug: string): AssetCheckItem[] {
  const keys = Object.keys(loadManifest(slug));
  const has = (key: string) => keys.includes(key);
  const months = Array.from({ length: 12 }, (_, index) => has(`m${String(index + 1).padStart(2, "0")}`)).filter(Boolean).length;
  const gallery = Array.from({ length: 30 }, (_, index) => has(`p${String(index + 1).padStart(2, "0")}`)).filter(Boolean).length;
  const bgm = fs.existsSync(path.join(publicOrderDir(slug), "bgm.mp3"));
  return [
    { key: "cover", present: has("cover"), count: has("cover") ? 1 : 0, total: 1 },
    { key: "months", present: months === 12, count: months, total: 12 },
    { key: "gallery", present: gallery === 30, count: gallery, total: 30 },
    { key: "bgm", present: bgm, count: bgm ? 1 : 0, total: 1 },
  ];
}
