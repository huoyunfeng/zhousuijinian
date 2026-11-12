import { anniversaryDate, dottedDate } from "./date";
import { HERO, LETTER, PDF, TIMELINE } from "./copy";
import type {
  FutureLetterSection,
  GallerySection,
  GrowthSection,
  GuestbookSection,
  HeroSection,
  LetterSection,
  OutroSection,
  Photo,
  Section,
  SectionKind,
  Story,
  Timeline12Section,
  TimelineItem,
} from "./types";

export interface PdfLetter {
  title: string;
  from: string;
  to?: string;
  signature?: string;
  /** 恒为 3 段，不足补空串（留白页） */
  pages: string[];
}

export interface PdfGuestbook {
  messages: GuestbookSection["messages"];
  total: number;
}

/** 未来信只保留信封信息，类型上就不含 body（DEV_SPEC 20.5） */
export interface PdfFuture {
  title: string;
  unlockText: string;
  from: string;
  writtenAt: string;
}

export interface PdfPlan {
  name: string;
  eyebrow: string;
  tagline: string;
  birthdayText: string;
  anniversaryText: string;
  cover: Photo | null;
  months: [TimelineItem[], TimelineItem[]];
  growth: GrowthSection | null;
  gallery: [Photo[], Photo[]];
  letter: PdfLetter | null;
  guestbook: PdfGuestbook | null;
  future: PdfFuture | null;
  outro: OutroSection | null;
}

const GALLERY_PER_PAGE = 9;
const GUESTBOOK_LIMIT = 12;
const LETTER_PAGES = 3;

function sectionOf<K extends SectionKind>(story: Story, kind: K): Extract<Section, { kind: K }> | null {
  const found = story.sections.find((section) => section.kind === kind && section.enabled);
  return (found as Extract<Section, { kind: K }> | undefined) ?? null;
}

function blankMonths(): TimelineItem[] {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    photo: { src: "", alt: "", ratio: "4:5" },
    note: TIMELINE.placeholder,
    placeholder: true,
  }));
}

/** 按段落与字符数把信均衡切成 pages 段，顺序不变 */
export function splitLetter(body: string, pages: number = LETTER_PAGES): string[] {
  const total = Math.max(1, pages);
  const paragraphs = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const chunks: string[][] = Array.from({ length: total }, () => []);
  if (paragraphs.length === 0) return chunks.map(() => "");

  const charTotal = paragraphs.reduce((sum, item) => sum + item.length, 0);
  const target = charTotal / total;
  let page = 0;
  let used = 0;

  for (const paragraph of paragraphs) {
    const overflow = used > 0 && used + paragraph.length * 0.55 > target;
    if (overflow && page < total - 1) {
      page += 1;
      used = 0;
    }
    chunks[page].push(paragraph);
    used += paragraph.length;
  }

  return chunks.map((items) => items.join("\n"));
}

function sanitizeName(name: string): string {
  const cleaned = name
    .replace(/[\s()[\]{}<>:"/\\|?*]/g, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .trim();
  return cleaned || PDF.defaultName;
}

export function pdfFileName(name: string, version?: number): string {
  return PDF.pdfFile(sanitizeName(name), version);
}

export function htmlFileName(name: string, version?: number): string {
  return PDF.htmlFile(sanitizeName(name), version);
}

export function planPdfPages(story: Story): PdfPlan {
  const hero = sectionOf(story, "hero") as HeroSection | null;
  const timeline = sectionOf(story, "timeline12") as Timeline12Section | null;
  const growth = sectionOf(story, "growth") as GrowthSection | null;
  const gallery = sectionOf(story, "gallery") as GallerySection | null;
  const letter = sectionOf(story, "letter") as LetterSection | null;
  const guestbook = sectionOf(story, "guestbook") as GuestbookSection | null;
  const future = sectionOf(story, "futureLetter") as FutureLetterSection | null;
  const outro = sectionOf(story, "outro") as OutroSection | null;

  const filled = blankMonths();
  for (const item of timeline?.items ?? []) {
    if (item.month >= 1 && item.month <= 12) filled[item.month - 1] = item;
  }

  const photos = gallery?.photos ?? [];
  const messages = guestbook?.messages ?? [];
  const name = hero?.name ?? PDF.defaultName;
  const anniversary = hero ? anniversaryDate(hero.birthday, 1) : "";

  return {
    name,
    eyebrow: anniversary ? HERO.eyebrow(Number(anniversary.slice(0, 4))) : "",
    tagline: hero?.tagline ?? "",
    birthdayText: hero ? dottedDate(hero.birthday) : "",
    anniversaryText: anniversary ? dottedDate(anniversary) : "",
    cover: hero?.cover ?? null,
    months: [filled.slice(0, 6), filled.slice(6, 12)],
    growth,
    gallery: [photos.slice(0, GALLERY_PER_PAGE), photos.slice(GALLERY_PER_PAGE, GALLERY_PER_PAGE * 2)],
    letter: letter
      ? {
          title: letter.title ?? LETTER.fallbackTitle,
          from: letter.from,
          to: letter.to,
          signature: letter.signature,
          pages: splitLetter(letter.body, LETTER_PAGES),
        }
      : null,
    guestbook: guestbook
      ? { messages: messages.slice(0, GUESTBOOK_LIMIT), total: messages.length }
      : null,
    future: future
      ? {
          title: future.title,
          unlockText: dottedDate(future.unlockAt),
          from: future.from,
          writtenAt: future.writtenAt,
        }
      : null,
    outro,
  };
}
