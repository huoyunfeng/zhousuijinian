import fs from "node:fs";
import path from "node:path";
import { isExpired, shanghaiToday } from "./date";
import { TIMELINE, VALIDATION } from "./copy";
import { sortMessages } from "./guestbook";
import { storySchema, type ParsedStory } from "./schema";
import type {
  GallerySection,
  ImageManifest,
  Section,
  Story,
  Timeline12Section,
  TimelineItem,
} from "./types";

export const CONTENT_DIR = path.resolve(process.cwd(), process.env.CONTENT_DIR ?? "content/orders");
export const PUBLIC_DIR = path.resolve(process.cwd(), process.env.PUBLIC_DIR ?? "public/orders");

export const SECTION_ORDER: Section["kind"][] = [
  "hero",
  "timeline12",
  "growth",
  "zhuazhou",
  "gallery",
  "letter",
  "futureLetter",
  "guestbook",
  "outro",
];

export class StoryError extends Error {
  issues: string[];
  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = "StoryError";
    this.issues = issues;
  }
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]{3,40}$/.test(slug);
}

export function storyPath(slug: string): string {
  return path.join(CONTENT_DIR, slug, "story.json");
}

export function orderDir(slug: string): string {
  return path.join(CONTENT_DIR, slug);
}

export function publicOrderDir(slug: string): string {
  return path.join(PUBLIC_DIR, slug);
}

export function normalize(input: ParsedStory, options: { today?: string } = {}): Story {
  const today = options.today ?? shanghaiToday();

  const sorted = [...input.sections].sort(
    (a, b) => SECTION_ORDER.indexOf(a.kind) - SECTION_ORDER.indexOf(b.kind),
  );

  const sections: Section[] = sorted.map((section) => {
    if (section.kind === "timeline12") {
      return normalizeTimeline(section);
    }
    if (section.kind === "gallery") {
      return normalizeGallery(section);
    }
    if (section.kind === "futureLetter") {
      const locked = today < section.unlockAt;
      return { ...section, body: locked ? "" : section.body, locked };
    }
    if (section.kind === "guestbook") {
      return {
        ...section,
        messages: sortMessages(section.messages),
        enabled: section.enabled && section.messages.length > 0,
      };
    }
    if (section.kind === "zhuazhou") {
      return { ...section, enabled: section.enabled && section.items.length >= 3 };
    }
    return { ...section };
  });

  return {
    slug: input.slug,
    kind: input.kind,
    theme: input.theme,
    meta: input.meta,
    access: input.access,
    sections,
  };
}

function normalizeTimeline(section: Timeline12Section): Timeline12Section {
  const seen = new Set<number>();
  const items: TimelineItem[] = [];
  for (const item of [...section.items].sort((a, b) => a.month - b.month)) {
    if (seen.has(item.month)) continue;
    seen.add(item.month);
    items.push(item);
    if (items.length === 12) break;
  }

  const filled: TimelineItem[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const existing = items.find((item) => item.month === month);
    if (existing) {
      filled.push(existing);
    } else {
      filled.push({
        month,
        photo: { src: "", alt: "", ratio: "4:5" },
        note: TIMELINE.placeholder,
        placeholder: true,
      });
    }
  }

  return { ...section, items: filled };
}

function normalizeGallery(section: GallerySection): GallerySection {
  const seen = new Set<string>();
  const photos = section.photos.filter((photo) => {
    if (seen.has(photo.src)) return false;
    seen.add(photo.src);
    return true;
  });
  const truncated = photos.slice(0, 60);
  return { ...section, photos: truncated, enabled: section.enabled && truncated.length > 0 };
}

export async function loadStory(slug: string): Promise<Story | null> {
  if (!isValidSlug(slug)) return null;
  const file = storyPath(slug);
  if (!fs.existsSync(file)) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(await fs.promises.readFile(file, "utf8"));
  } catch (error) {
    throw new StoryError(`${VALIDATION.schemaFailed}：JSON 无法解析`, [
      error instanceof Error ? error.message : String(error),
    ]);
  }

  const parsed = storySchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new StoryError(`${VALIDATION.schemaFailed}\n${detail.join("\n")}`, detail);
  }

  return normalize(parsed.data);
}

export async function saveStory(slug: string, story: Story): Promise<void> {
  const parsed = storySchema.safeParse(story);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new StoryError(`${VALIDATION.schemaFailed}\n${detail.join("\n")}`, detail);
  }
  const file = storyPath(slug);
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, `${JSON.stringify(parsed.data, null, 2)}\n`, "utf8");
}

const accessCache = new Map<string, { mtimeMs: number; value: { mode: string; expired: boolean } }>();

/** 中间件/页面用：只读 access 字段，按 mtime 缓存（DEV_SPEC 8.8） */
export async function peekAccess(
  slug: string,
): Promise<{ mode: "password" | "public"; expired: boolean } | null> {
  if (!isValidSlug(slug)) return null;
  const file = storyPath(slug);
  if (!fs.existsSync(file)) return null;
  const stat = await fs.promises.stat(file);
  const cached = accessCache.get(slug);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return {
      mode: cached.value.mode === "public" ? "public" : "password",
      expired: cached.value.expired,
    };
  }
  try {
    const raw: unknown = JSON.parse(await fs.promises.readFile(file, "utf8"));
    const parsed = storySchema.safeParse(raw);
    if (!parsed.success) return { mode: "password", expired: false };
    const value = {
      mode: parsed.data.access.mode,
      expired: isExpired(parsed.data.access.expiresAt),
    };
    accessCache.set(slug, { mtimeMs: stat.mtimeMs, value });
    return { mode: value.mode, expired: value.expired };
  } catch {
    return { mode: "password", expired: false };
  }
}

export function loadManifest(slug: string): ImageManifest {
  const file = path.join(publicOrderDir(slug), "manifest.json");
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as ImageManifest;
  } catch {
    return {};
  }
}

export function findHeroSection(story: Story) {
  return story.sections.find((section) => section.kind === "hero") ?? null;
}

export function enabledSections(story: Story): Section[] {
  return story.sections.filter((section) => section.enabled);
}

/** 列出被 story 引用的图片文件名（用于生成前检查） */
export function referencedAssets(story: Story): string[] {
  const files = new Set<string>();
  for (const section of story.sections) {
    if (!section.enabled) continue;
    if (section.kind === "hero") files.add(section.cover.src);
    if (section.kind === "timeline12") {
      for (const item of section.items) if (!item.placeholder && item.photo.src) files.add(item.photo.src);
    }
    if (section.kind === "gallery") {
      for (const photo of section.photos) files.add(photo.src);
      for (const group of section.groups ?? []) {
        for (const photo of group.photos) files.add(photo.src);
      }
    }
    if (section.kind === "letter" && section.handwriting) files.add(section.handwriting.src);
  }
  return [...files];
}
