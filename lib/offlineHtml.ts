import { anniversaryDate, dottedDate } from "./date";
import {
  GROWTH,
  GUESTBOOK,
  HERO,
  LETTER,
  OFFLINE,
  SECTION_ANCHORS,
  SECTION_TITLES,
  TIMELINE,
  ZHUAZHOU,
} from "./copy";
import type {
  FutureLetterSection,
  GallerySection,
  GrowthSection,
  GuestbookSection,
  HeroSection,
  LetterSection,
  OutroSection,
  Story,
  Timeline12Section,
  ZhuazhouSection,
} from "./types";

export interface OfflineInput {
  /** futureLetter.body 已置空 */
  story: Story;
  /** 文件名 → data:image/jpeg;base64,... */
  images: Record<string, string>;
  audio: string | null;
  tokensCss: string;
  generatedAt: string;
  version: number;
  contact: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function imageUri(images: Record<string, string>, src: string): string {
  return images[src] ?? "";
}

function imageTag(
  images: Record<string, string>,
  src: string,
  alt: string,
  className: string,
  eager = false,
): string {
  const uri = imageUri(images, src);
  if (!uri) return "";
  return `<img class="${className}" src="${uri}" alt="${escapeHtml(alt)}"${
    eager ? "" : ' loading="lazy"'
  } decoding="async" />`;
}

function sectionHead(kind: keyof typeof SECTION_TITLES): string {
  const copy = SECTION_TITLES[kind];
  if (!copy.title) return "";
  return `<header class="section__head">
  ${copy.index ? `<span class="section__index">${escapeHtml(copy.index)}</span>` : ""}
  <h2 class="section__title">${escapeHtml(copy.title)}</h2>
  ${copy.subtitle ? `<p class="section__sub">${escapeHtml(copy.subtitle)}</p>` : ""}
</header>`;
}

function heroHtml(images: Record<string, string>, hero: HeroSection): string {
  const cover = imageUri(images, hero.cover.src);
  const anniversary = anniversaryDate(hero.birthday, 1);
  const year = Number(anniversary.slice(0, 4));
  return `<header class="hero" id="top">
  ${cover ? `<img class="hero__img" src="${cover}" alt="${escapeHtml(hero.cover.alt)}" />` : ""}
  <div class="hero__veil"></div>
  <div class="hero__inner">
    <p class="hero__eyebrow">${escapeHtml(HERO.eyebrow(year))}</p>
    <h1 class="hero__name">${escapeHtml(hero.name)}</h1>
    <p class="hero__tagline">${escapeHtml(hero.tagline)}</p>
    <p class="hero__meta">${escapeHtml(dottedDate(anniversary))}</p>
  </div>
</header>`;
}

function timelineHtml(section: Timeline12Section, images: Record<string, string>): string {
  const items = section.items
    .map((item) => {
      const photo =
        item.placeholder || !item.photo.src
          ? `<div class="month__photo month__photo--empty">${escapeHtml(TIMELINE.placeholder)}</div>`
          : `<div class="month__photo">${imageTag(images, item.photo.src, item.photo.alt, "month__img")}</div>`;
      return `<figure class="month">
  ${photo}
  <figcaption class="month__body">
    <span class="month__index">${TIMELINE.monthLabel(item.month)}</span>
    <span class="month__note">${escapeHtml(item.note)}</span>
    ${item.date ? `<span class="month__date">${escapeHtml(item.date)}</span>` : ""}
  </figcaption>
</figure>`;
    })
    .join("\n");

  return `<section class="section" id="${SECTION_ANCHORS.timeline12}">
  ${sectionHead("timeline12")}
  <div class="months">${items}</div>
</section>`;
}

function chartSvg(points: GrowthSection["points"]): string {
  const sorted = [...points].sort((a, b) => a.month - b.month);
  if (sorted.length < 2) return "";
  const width = 320;
  const height = 180;
  const pad = 18;
  const values = sorted.map((point) => point.height);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const low = min - span * 0.18;
  const high = max + span * 0.18;
  const x = (month: number) => pad + (month / 12) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - low) / (high - low)) * (height - pad * 2);
  const coords = sorted.map((point) => `${x(point.month)},${y(point.height)}`);
  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point}`).join(" ");
  const area = `${line} L${x(sorted[sorted.length - 1].month)},${height - pad} L${x(sorted[0].month)},${
    height - pad
  } Z`;
  const dots = coords
    .map(
      (point) =>
        `<circle cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="2.4" fill="var(--c-surface)" stroke="var(--c-accent)" stroke-width="1.2" />`,
    )
    .join("");

  return `<svg class="growth__chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(
    GROWTH.chartLabel,
  )}">
  <path d="${area}" fill="var(--c-accent-soft)" opacity="0.7"></path>
  <path d="${line}" fill="none" stroke="var(--c-accent)" stroke-width="1.6" stroke-linecap="round"></path>
  ${dots}
</svg>`;
}

function growthHtml(section: GrowthSection): string {
  const sorted = [...section.points].sort((a, b) => a.month - b.month);
  const latest = sorted[sorted.length - 1];
  const stats = latest
    ? `<div class="stats">
  <div class="stat"><strong>${latest.height.toFixed(1)}<small>${escapeHtml(GROWTH.unit.height)}</small></strong><span>${escapeHtml(GROWTH.height)}</span></div>
  <div class="stat"><strong>${latest.weight.toFixed(1)}<small>${escapeHtml(GROWTH.unit.weight)}</small></strong><span>${escapeHtml(GROWTH.weight)}</span></div>
  <div class="stat"><strong>${section.teeth !== undefined ? section.teeth : "—"}${
          section.teeth !== undefined ? `<small>${escapeHtml(GROWTH.unit.teeth)}</small>` : ""
        }</strong><span>${escapeHtml(GROWTH.teeth)}</span></div>
</div>`
    : "";

  const firsts = (section.firsts ?? [])
    .slice(0, 6)
    .map(
      (item) =>
        `<li class="first"><span>${escapeHtml(item.label)}</span><span class="first__at">${escapeHtml(
          item.at,
        )}</span></li>`,
    )
    .join("");

  return `<section class="section" id="${SECTION_ANCHORS.growth}">
  ${sectionHead("growth")}
  ${stats}
  ${chartSvg(section.points)}
  ${firsts ? `<ul class="firsts">${firsts}</ul>` : ""}
</section>`;
}

const ZZ_ICONS: Record<string, string> = {
  brush:
    '<path d="M40 10l9 9-22 22-11 2 2-11z"/><path d="M40 10l4-4 9 9-4 4"/><path d="M18 42l-4 4"/>',
  book:
    '<path d="M20 12h24a4 4 0 014 4v34H24a4 4 0 01-4-4z"/><path d="M20 42a4 4 0 014-4h24"/><path d="M26 12v30"/><circle cx="30" cy="20" r="1.2"/><circle cx="30" cy="27" r="1.2"/><circle cx="30" cy="34" r="1.2"/>',
  abacus:
    '<rect x="12" y="14" width="40" height="36" rx="3"/><path d="M12 26h40M12 38h40"/><circle cx="21" cy="20" r="2.2"/><circle cx="30" cy="20" r="2.2"/><circle cx="39" cy="20" r="2.2"/><circle cx="25" cy="32" r="2.2"/><circle cx="34" cy="32" r="2.2"/><circle cx="43" cy="32" r="2.2"/>',
  seal:
    '<path d="M24 18h16v10H24z"/><path d="M28 28v10h8V28"/><path d="M18 42h28v10H18z"/><path d="M14 52h36"/><path d="M42 14c2-3 5-3 6 0s-2 4-6 3"/>',
  coin:
    '<circle cx="32" cy="32" r="20"/><rect x="26" y="26" width="12" height="12" rx="1"/><path d="M22 20l3 2M42 42l3 2M20 38l2 2M42 24l2-2"/>',
  stethoscope:
    '<path d="M22 12v12a8 8 0 0016 0V12"/><path d="M22 12h-4M38 12h4"/><path d="M30 32v10a8 8 0 008 8h2a6 6 0 006-6v-4"/><circle cx="46" cy="36" r="4"/>',
};

function zhuazhouIcon(key: string): string {
  const paths = ZZ_ICONS[key] ?? ZZ_ICONS.book;
  return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function zhuazhouHtml(section: ZhuazhouSection): string {
  const columns = [23, 50, 77];
  const rows = [28, 64];
  const items = section.items
    .map((item, index) => {
      const x = columns[index % 3];
      const y = rows[index < 3 ? 0 : 1];
      return `<button class="zz__item" type="button" data-zz data-fortune="${escapeHtml(
        item.fortune,
      )}" data-meaning="${escapeHtml(item.meaning)}" aria-label="${escapeHtml(
        ZHUAZHOU.itemAria(item.label),
      )}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%">
  <span class="zz__icon">${zhuazhouIcon(item.key)}</span>
  <span class="zz__label">${escapeHtml(item.label)}</span>
</button>`;
    })
    .join("\n");

  return `<section class="section" id="${SECTION_ANCHORS.zhuazhou}">
  ${sectionHead("zhuazhou")}
  <p class="hint">${escapeHtml(ZHUAZHOU.hint)}</p>
  <div class="zz" id="zz" role="group" aria-label="${escapeHtml(ZHUAZHOU.sceneAria)}">
    <div class="zz__cloth" aria-hidden="true"></div>
    <div class="zz__items">${items}</div>
  </div>
  <div class="zz__result" id="zz-result" role="status" aria-live="polite" hidden>
    <p class="zz__fortune" id="zz-fortune"></p>
    <p class="zz__meaning" id="zz-meaning"></p>
    <button class="zz__again" id="zz-again" type="button">${escapeHtml(ZHUAZHOU.again)}</button>
    <span class="zz__seal" aria-hidden="true">${escapeHtml(ZHUAZHOU.seal)}</span>
  </div>
</section>`;
}

function galleryHtml(section: GallerySection, images: Record<string, string>): string {
  const cells = section.photos
    .map((photo, index) => {
      const uri = imageUri(images, photo.src);
      if (!uri) return "";
      return `<button class="gallery__item" type="button" data-lightbox data-index="${index}" data-src="${uri}" data-alt="${escapeHtml(
        photo.alt,
      )}" aria-label="${escapeHtml(photo.alt || SECTION_TITLES.gallery.title)}">
  <img src="${uri}" alt="${escapeHtml(photo.alt)}" loading="lazy" decoding="async" />
</button>`;
    })
    .join("\n");

  return `<section class="section" id="${SECTION_ANCHORS.gallery}">
  ${sectionHead("gallery")}
  <div class="gallery">${cells}</div>
</section>`;
}

function letterHtml(section: LetterSection, images: Record<string, string>): string {
  const paragraphs = section.body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("\n");

  const handwriting = section.handwriting
    ? imageTag(images, section.handwriting.src, section.handwriting.alt, "letter__handwriting")
    : "";
  const signatureUri = images["signature.png"];
  const signature = signatureUri
    ? `<img class="letter__signature" src="${signatureUri}" alt="${escapeHtml(OFFLINE.signatureAlt)}" />`
    : "";

  return `<section class="section" id="${SECTION_ANCHORS.letter}">
  ${sectionHead("letter")}
  <h3 class="letter__title">${escapeHtml(section.title ?? LETTER.fallbackTitle)}</h3>
  <div class="letter__body">${paragraphs}</div>
  ${handwriting}
  ${signature}
  <p class="letter__sign">${escapeHtml(section.signature ?? section.from)}</p>
</section>`;
}

function futureHtml(section: FutureLetterSection): string {
  return `<section class="section" id="${SECTION_ANCHORS.futureLetter}">
  ${sectionHead("futureLetter")}
  <div class="envelope">
    <p class="envelope__label">${escapeHtml(SECTION_TITLES.futureLetter.title)}</p>
    <h3 class="envelope__title">${escapeHtml(section.title)}</h3>
    <p class="envelope__date">${escapeHtml(dottedDate(section.unlockAt))}</p>
    <p class="envelope__hint">${escapeHtml(OFFLINE.futureHint)}</p>
    <p class="envelope__note">${escapeHtml(OFFLINE.futureOmitted)}</p>
    <p class="envelope__from">${escapeHtml(`${section.from} · ${section.writtenAt}`)}</p>
  </div>
</section>`;
}

function guestbookHtml(section: GuestbookSection): string {
  const items = section.messages
    .map(
      (message) => `<figure class="bless">
  <blockquote>${escapeHtml(message.text)}</blockquote>
  <figcaption>${escapeHtml(GUESTBOOK.from(message.from, message.relation))}${
        message.audio ? `<span class="bless__voice">${escapeHtml(OFFLINE.voiceMissing)}</span>` : ""
      }</figcaption>
</figure>`,
    )
    .join("\n");

  return `<section class="section" id="${SECTION_ANCHORS.guestbook}">
  ${sectionHead("guestbook")}
  <div class="blesses">${items}</div>
</section>`;
}

function outroHtml(section: OutroSection | null): string {
  return `<section class="section section--end" id="${SECTION_ANCHORS.outro}">
  <p class="end__thanks">${escapeHtml(section?.thanks ?? "")}</p>
  <p class="end__sign">${escapeHtml(section?.signature ?? "")}</p>
</section>`;
}

function contentsList(story: Story): string[] {
  return story.sections
    .filter((section) => section.enabled)
    .map((section) => {
      if (section.kind === "hero") return OFFLINE.cover;
      if (section.kind === "outro") return OFFLINE.ending;
      const copy = SECTION_TITLES[section.kind];
      return "title" in copy ? copy.title : "";
    })
    .filter((title) => title.length > 0);
}

function sanitizeStory(story: Story, labels: Record<string, string>): unknown {
  const sections = story.sections.map((section) => {
    if (section.kind !== "futureLetter") return section;
    const copy = { ...section, locked: true } as Record<string, unknown>;
    delete copy.body;
    return copy;
  });
  return {
    slug: story.slug,
    theme: story.theme,
    meta: story.meta,
    sections,
    labels,
  };
}

const BASE_CSS = `*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--c-bg);color:var(--c-ink);font-family:var(--font-body);line-height:1.8;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
[hidden]{display:none!important}
.nav{position:fixed;right:14px;top:50%;transform:translateY(-50%);z-index:40;display:flex;flex-direction:column;gap:10px}
.nav a{display:block;width:8px;height:8px;border-radius:50%;background:var(--c-line);transition:transform .2s,background .2s}
.nav a.is-active{background:var(--c-accent);transform:scale(1.6)}
.hero{position:relative;min-height:100vh;display:flex;align-items:flex-end;overflow:hidden;color:#fff}
.hero__img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero__veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.12) 0%,rgba(0,0,0,.6) 100%)}
.hero__inner{position:relative;width:100%;max-width:760px;margin:0 auto;padding:0 24px 72px}
.hero__eyebrow{margin:0 0 12px;font-size:13px;letter-spacing:.24em;color:rgba(255,255,255,.82)}
.hero__name{margin:0;font-family:var(--font-display);font-size:44px;font-weight:500;letter-spacing:.08em}
.hero__tagline{margin:14px 0 0;font-size:17px;color:rgba(255,255,255,.92)}
.hero__meta{margin:10px 0 0;font-family:var(--font-num);font-size:12px;letter-spacing:.16em;color:rgba(255,255,255,.78)}
.section{max-width:760px;margin:0 auto;padding:64px 24px}
.section__head{margin-bottom:28px}
.section__index{display:block;font-family:var(--font-num);font-size:12px;letter-spacing:.2em;color:var(--c-accent)}
.section__title{margin:6px 0 0;font-family:var(--font-display);font-size:28px;font-weight:500;letter-spacing:.04em}
.section__sub{margin:8px 0 0;font-size:13px;color:var(--c-ink-3)}
.months{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 16px}
.month{margin:0}
.month__photo{position:relative;overflow:hidden;border-radius:3px;background:var(--c-skeleton);aspect-ratio:4/5;outline:.5pt solid rgba(0,0,0,.1)}
.month__img{width:100%;height:100%;object-fit:cover}
.month__photo--empty{display:flex;align-items:center;justify-content:center;padding:16px;text-align:center;font-size:12px;line-height:1.7;color:var(--c-ink-3);border:1px dashed var(--c-line);background:transparent}
.month__body{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin-top:10px}
.month__index{font-family:var(--font-num);font-size:15px;letter-spacing:.08em;color:var(--c-accent)}
.month__note{font-family:var(--font-display);font-size:15px}
.month__date{width:100%;font-size:11px;color:var(--c-ink-3)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:20px 0;border-top:1px solid var(--c-line);border-bottom:1px solid var(--c-line);text-align:center}
.stat strong{display:block;font-family:var(--font-num);font-size:28px;font-weight:500}
.stat small{margin-left:3px;font-size:11px;color:var(--c-ink-3)}
.stat span{display:block;margin-top:4px;font-size:11px;letter-spacing:.14em;color:var(--c-ink-3)}
.growth__chart{display:block;width:100%;height:auto;margin-top:24px}
.firsts{list-style:none;margin:24px 0 0;padding:0;border-top:1px solid var(--c-line)}
.first{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--c-line);font-size:13px;color:var(--c-ink-2)}
.first__at{font-family:var(--font-num);font-size:11px;color:var(--c-ink-3)}
.hint{margin:0 0 18px;font-size:13px;color:var(--c-ink-3)}
.zz{position:relative;width:min(360px,86vw);aspect-ratio:1;margin:0 auto;border-radius:12px;background:radial-gradient(circle at 50% 28%,rgba(255,255,255,.5),transparent 62%),var(--c-surface);box-shadow:inset 0 0 60px rgba(43,38,34,.08)}
.zz__cloth{position:absolute;left:50%;top:50%;width:280px;height:280px;transform:translate(-50%,-50%);background-color:#B23A2E;background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.08) 0 1px,transparent 1px 4px),repeating-linear-gradient(0deg,rgba(0,0,0,.08) 0 1px,transparent 1px 4px),radial-gradient(circle at 50% 30%,rgba(255,255,255,.16),transparent 70%);border-radius:42% 58% 46% 54% / 55% 45% 55% 45%;box-shadow:0 10px 28px rgba(120,30,20,.25)}
.zz__items{position:absolute;inset:0}
.zz__item{position:absolute;width:84px;height:84px;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#f0e0c6;transition:transform .22s,opacity .22s}
.zz__item:active{transform:translate(-50%,-50%) scale(1.06)}
.zz__icon{display:block;width:60px;height:60px;filter:drop-shadow(0 3px 6px rgba(43,38,34,.18))}
.zz__icon svg{width:60px;height:60px}
.zz__label{font-family:var(--font-display);font-size:12px;letter-spacing:.08em;color:#f0e0c6;opacity:.9}
.zz__result{position:relative;margin-top:22px;padding:26px 24px 30px;background:var(--c-surface);border:1px solid var(--c-line);border-radius:12px;text-align:center;box-shadow:0 10px 30px rgba(43,38,34,.08)}
.zz__fortune{margin:0;font-family:var(--font-display);font-size:22px}
.zz__meaning{margin:10px 0 18px;font-size:14px;color:var(--c-ink-2)}
.zz__again{padding:8px 18px;border:1px solid var(--c-accent);border-radius:999px;font-size:13px;color:var(--c-accent)}
.zz__seal{position:absolute;right:16px;bottom:14px;display:flex;align-items:center;justify-content:center;width:38px;height:38px;border:2px solid #B23A2E;border-radius:4px;color:#B23A2E;font-family:var(--font-display);font-size:11px;line-height:1.1;letter-spacing:.04em;transform:rotate(-4deg);opacity:.85;text-align:center}
.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.bless__voice{display:inline-block;margin-left:8px;padding:1px 6px;border:1px solid var(--c-line);border-radius:999px;font-size:10px;color:var(--c-ink-3)}
.letter__signature{display:block;width:120px;height:auto;margin:12px 0 0 auto;mix-blend-mode:multiply}
.gallery__item{overflow:hidden;border-radius:2px;outline:.5pt solid rgba(0,0,0,.08)}
.gallery__item img{width:100%;aspect-ratio:1;object-fit:cover;transition:transform .4s}
.gallery__item:hover img{transform:scale(1.04)}
.letter__title{margin:0 0 18px;font-family:var(--font-display);font-size:22px;font-weight:500}
.letter__body{font-family:var(--font-display);font-size:18px;line-height:2.05}
.letter__body p{margin:0 0 1em;text-indent:2em}
.letter__handwriting{margin:20px auto 0;max-width:70%;border-radius:2px}
.letter__sign{margin:28px 0 0;text-align:right;font-family:var(--font-display);font-size:16px;color:var(--c-ink-2)}
.envelope{padding:36px 24px;background:var(--c-surface);border:1px dashed var(--c-accent);border-radius:6px;text-align:center}
.envelope__label{margin:0;font-size:12px;letter-spacing:.24em;color:var(--c-ink-3)}
.envelope__title{margin:18px 0 0;font-family:var(--font-display);font-size:24px;font-weight:500}
.envelope__date{margin:20px 0 0;font-family:var(--font-num);font-size:26px;letter-spacing:.12em;color:var(--c-accent)}
.envelope__hint{margin:8px 0 0;font-size:12px;letter-spacing:.12em;color:var(--c-ink-3)}
.envelope__note{margin:24px 0 0;font-size:13px;color:var(--c-ink-2)}
.envelope__from{margin:24px 0 0;font-size:12px;letter-spacing:.08em;color:var(--c-ink-3)}
.blesses{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.bless{margin:0;padding:18px;background:var(--c-surface);border:1px solid var(--c-line);border-radius:6px}
.bless blockquote{margin:0;font-family:var(--font-display);font-size:15px;line-height:1.9}
.bless figcaption{margin-top:8px;text-align:right;font-size:11px;color:var(--c-ink-3)}
.section--end{text-align:center;padding-top:88px;padding-bottom:48px}
.end__thanks{margin:0;font-family:var(--font-display);font-size:26px}
.end__sign{margin:12px 0 0;font-size:14px;color:var(--c-ink-2)}
.colophon{max-width:760px;margin:0 auto;padding:32px 24px 56px;border-top:1px solid var(--c-line);font-size:11px;line-height:2;color:var(--c-ink-3);text-align:center}
.colophon p{margin:0}
.audio{position:fixed;left:18px;bottom:18px;z-index:40;width:38px;height:38px;border-radius:50%;background:var(--c-surface);border:1px solid var(--c-line);display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--c-accent);box-shadow:0 4px 14px rgba(0,0,0,.08)}
.audio.is-playing{background:var(--c-accent);color:var(--c-surface);border-color:var(--c-accent)}
.lightbox{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(20,18,16,.94)}
.lightbox__img{max-width:92vw;max-height:82vh;object-fit:contain;border-radius:2px}
.lightbox__close{position:absolute;top:16px;right:18px;font-size:28px;color:#fff;line-height:1}
.lightbox__nav{position:absolute;top:50%;transform:translateY(-50%);font-size:32px;color:#fff;padding:12px}
.lightbox__nav--prev{left:8px}
.lightbox__nav--next{right:8px}
@media (min-width:720px){.section{padding:80px 32px}.hero__inner{padding:0 32px 96px}.hero__name{font-size:52px}}
@media (max-width:640px){.nav{display:none}.blesses{grid-template-columns:1fr}}
@media print{.nav,.audio{display:none}}`;

const BASE_JS = `(function(){
  var data = window.__STORY__ || {};
  var labels = data.labels || {};
  var audio = document.getElementById("bgm");
  var audioBtn = document.getElementById("audio-toggle");
  if (audio && audioBtn) {
    audioBtn.addEventListener("click", function(){
      if (audio.paused) {
        var playing = audio.play();
        if (playing && playing.catch) playing.catch(function(){});
        audioBtn.classList.add("is-playing");
        audioBtn.setAttribute("aria-label", labels.pause || "");
      } else {
        audio.pause();
        audioBtn.classList.remove("is-playing");
        audioBtn.setAttribute("aria-label", labels.play || "");
      }
    });
  }

  var zz = document.getElementById("zz");
  var zzResult = document.getElementById("zz-result");
  var zzFortune = document.getElementById("zz-fortune");
  var zzMeaning = document.getElementById("zz-meaning");
  var zzAgain = document.getElementById("zz-again");
  if (zz && zzResult && zzFortune && zzMeaning && zzAgain) {
    zz.addEventListener("click", function(event){
      var target = event.target;
      while (target && target !== zz && !target.hasAttribute("data-zz")) target = target.parentElement;
      if (!target || target === zz) return;
      zzFortune.textContent = target.getAttribute("data-fortune") || "";
      zzMeaning.textContent = target.getAttribute("data-meaning") || "";
      zz.hidden = true;
      zzResult.hidden = false;
      zzAgain.focus();
    });
    zzAgain.addEventListener("click", function(){
      zzResult.hidden = true;
      zz.hidden = false;
    });
  }

  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  var current = 0;
  function show(index){
    if (!lightbox || !lightboxImg || buttons.length === 0) return;
    current = (index + buttons.length) % buttons.length;
    lightboxImg.src = buttons[current].getAttribute("data-src") || "";
    lightboxImg.alt = buttons[current].getAttribute("data-alt") || "";
    lightbox.hidden = false;
  }
  function hide(){ if (lightbox) lightbox.hidden = true; }
  buttons.forEach(function(button){
    button.addEventListener("click", function(){
      show(Number(button.getAttribute("data-index") || "0"));
    });
  });
  if (lightbox) {
    var close = document.getElementById("lightbox-close");
    var prev = document.getElementById("lightbox-prev");
    var next = document.getElementById("lightbox-next");
    if (close) close.addEventListener("click", hide);
    if (prev) prev.addEventListener("click", function(){ show(current - 1); });
    if (next) next.addEventListener("click", function(){ show(current + 1); });
    lightbox.addEventListener("click", function(event){ if (event.target === lightbox) hide(); });
    document.addEventListener("keydown", function(event){
      if (lightbox.hidden) return;
      if (event.key === "Escape") hide();
      if (event.key === "ArrowLeft") show(current - 1);
      if (event.key === "ArrowRight") show(current + 1);
    });
  }

  if ("IntersectionObserver" in window) {
    var links = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (!entry.isIntersecting) return;
        links.forEach(function(link){
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    links.forEach(function(link){
      var id = (link.getAttribute("href") || "").slice(1);
      var target = document.getElementById(id);
      if (target) observer.observe(target);
    });
  }
})();`;

export function buildOfflineHtml(input: OfflineInput): string {
  const { story, images, audio, tokensCss, generatedAt, version, contact } = input;

  const labels = {
    play: OFFLINE.playMusic,
    pause: OFFLINE.pauseMusic,
  };

  const hero = story.sections.find((section): section is HeroSection => section.kind === "hero");
  const timeline = story.sections.find(
    (section): section is Timeline12Section => section.kind === "timeline12" && section.enabled,
  );
  const growth = story.sections.find(
    (section): section is GrowthSection => section.kind === "growth" && section.enabled,
  );
  const zhuazhou = story.sections.find(
    (section): section is ZhuazhouSection => section.kind === "zhuazhou" && section.enabled,
  );
  const gallery = story.sections.find(
    (section): section is GallerySection => section.kind === "gallery" && section.enabled,
  );
  const letter = story.sections.find(
    (section): section is LetterSection => section.kind === "letter" && section.enabled,
  );
  const future = story.sections.find(
    (section): section is FutureLetterSection => section.kind === "futureLetter" && section.enabled,
  );
  const guestbook = story.sections.find(
    (section): section is GuestbookSection => section.kind === "guestbook" && section.enabled,
  );
  const outro = story.sections.find(
    (section): section is OutroSection => section.kind === "outro" && section.enabled,
  );

  const nav = story.sections
    .filter((section) => section.enabled)
    .map((section) => {
      const anchor = SECTION_ANCHORS[section.kind];
      const label =
        section.kind === "hero"
          ? OFFLINE.cover
          : section.kind === "outro"
            ? OFFLINE.ending
            : SECTION_TITLES[section.kind].title;
      return `<a href="#${anchor}" data-nav aria-label="${escapeHtml(label)}" title="${escapeHtml(
        label,
      )}"></a>`;
    })
    .join("");

  const sections = [
    hero ? heroHtml(images, hero) : "",
    timeline ? timelineHtml(timeline, images) : "",
    growth ? growthHtml(growth) : "",
    zhuazhou ? zhuazhouHtml(zhuazhou) : "",
    gallery ? galleryHtml(gallery, images) : "",
    letter ? letterHtml(letter, images) : "",
    future ? futureHtml(future) : "",
    guestbook ? guestbookHtml(guestbook) : "",
    outroHtml(outro ?? null),
  ]
    .filter((block) => block.length > 0)
    .join("\n");

  const contents = contentsList(story);
  const contentsText = OFFLINE.contents(contents);
  const audioMarkup = audio
    ? `<button class="audio" id="audio-toggle" type="button" aria-label="${escapeHtml(
        OFFLINE.playMusic,
      )}">♪</button>
<audio id="bgm" src="${audio}" preload="none"></audio>`
    : "";

  const footerLines = [
    OFFLINE.generatedAt(generatedAt, version),
    contentsText,
    OFFLINE.contact(contact),
    audio ? "" : OFFLINE.audioMissing,
  ]
    .filter((line) => line.length > 0)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

  return `<!doctype html>
<html lang="zh-CN" data-theme="${escapeHtml(story.theme)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content="yizhouji-offline" />
<title>${escapeHtml(story.meta.title)}</title>
<style>
${tokensCss}
${BASE_CSS}
</style>
</head>
<body>
<nav class="nav" aria-label="${escapeHtml(OFFLINE.navLabel)}">${nav}</nav>
<main>
${sections}
</main>
<footer class="colophon">${footerLines}</footer>
${audioMarkup}
<div class="lightbox" id="lightbox" hidden>
  <button class="lightbox__close" id="lightbox-close" type="button" aria-label="${escapeHtml(
    OFFLINE.lightboxClose,
  )}">×</button>
  <button class="lightbox__nav lightbox__nav--prev" id="lightbox-prev" type="button" aria-label="${escapeHtml(
    OFFLINE.lightboxPrev,
  )}">‹</button>
  <img class="lightbox__img" id="lightbox-img" alt="" />
  <button class="lightbox__nav lightbox__nav--next" id="lightbox-next" type="button" aria-label="${escapeHtml(
    OFFLINE.lightboxNext,
  )}">›</button>
</div>
<script>
window.__STORY__ = ${inlineJson(sanitizeStory(story, labels))};
${BASE_JS}
</script>
</body>
</html>`;
}
