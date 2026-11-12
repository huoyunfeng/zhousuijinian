/** 数据模型（与 DEV_SPEC 7.2 一一对应） */

export type ThemeKey = "paper-warm" | "film" | "minimal";
export type Ratio = "1:1" | "4:5" | "3:4" | "16:9";
export type LookKey = "none" | "warm" | "film" | "mono" | "soft" | "punch";

export interface Photo {
  /** 相对 public/orders/{slug}/ 的文件名 */
  src: string;
  alt: string;
  ratio: Ratio;
  /** 单张覆盖订单级配方（DEV_SPEC 8.5.1） */
  look?: LookKey;
}

export interface BaseSection {
  id: string;
  kind: SectionKind;
  enabled: boolean;
}

export type SectionKind =
  | "hero"
  | "timeline12"
  | "growth"
  | "zhuazhou"
  | "gallery"
  | "letter"
  | "futureLetter"
  | "guestbook"
  | "outro";

export interface HeroSection extends BaseSection {
  kind: "hero";
  name: string;
  tagline: string;
  birthday: string;
  cover: Photo;
  showAge: boolean;
}

export interface TimelineItem {
  month: number;
  photo: Photo;
  note: string;
  date?: string;
  tags?: string[];
  /** normalize 补位生成的占位卡（照片缺失） */
  placeholder?: boolean;
}

export interface Timeline12Section extends BaseSection {
  kind: "timeline12";
  items: TimelineItem[];
}

export interface GrowthSection extends BaseSection {
  kind: "growth";
  points: Array<{ month: number; height: number; weight: number }>;
  teeth?: number;
  firsts?: Array<{ label: string; at: string }>;
}

export interface ZhuazhouItem {
  /** 映射到内置手绘 SVG：brush / book / abacus / seal / coin / stethoscope（DEV_SPEC 6.4.2） */
  key: string;
  label: string;
  meaning: string;
  fortune: string;
}

export interface ZhuazhouSection extends BaseSection {
  kind: "zhuazhou";
  items: ZhuazhouItem[];
  /** 客户实际抓到的，用于证书与 PDF（DEV_SPEC 6.4.5） */
  result?: { key: string; date: string };
}

export interface GallerySection extends BaseSection {
  kind: "gallery";
  photos: Photo[];
  groups?: Array<{ title: string; photos: Photo[] }>;
}

export interface LetterSection extends BaseSection {
  kind: "letter";
  from: string;
  to?: string;
  title?: string;
  body: string;
  signature?: string;
  handwriting?: Photo;
}

export interface FutureLetterSection extends BaseSection {
  kind: "futureLetter";
  title: string;
  unlockAt: string;
  /** 锁定态由服务端置空，正文不进入 HTML */
  body: string;
  from: string;
  writtenAt: string;
  locked?: boolean;
}

export interface GuestbookMessage {
  text: string;
  from: string;
  relation?: string;
  /** 可选语音祝福，≤15 秒（DEV_SPEC v1.6 / 6.8） */
  audio?: string;
}

export interface GuestbookSection extends BaseSection {
  kind: "guestbook";
  messages: GuestbookMessage[];
}

export interface OutroSection extends BaseSection {
  kind: "outro";
  thanks: string;
  signature: string;
  showQr: boolean;
}

export type Section =
  | HeroSection
  | Timeline12Section
  | GrowthSection
  | ZhuazhouSection
  | GallerySection
  | LetterSection
  | FutureLetterSection
  | GuestbookSection
  | OutroSection;

export interface Story {
  slug: string;
  kind: "baby_first_birthday";
  theme: ThemeKey;
  meta: {
    title: string;
    description: string;
    ogImage?: string;
    /** 订单级调色配方，默认 warm（DEV_SPEC 8.5.1） */
    look: LookKey;
    /** 手写签名图（DEV_SPEC 4.10.6） */
    signature?: string;
  };
  access: { mode: "password" | "public"; password?: string; expiresAt?: string; noindex: boolean };
  sections: Section[];
}

export type OrderStatus =
  | "draft"
  | "paid"
  | "assets"
  | "building"
  | "review"
  | "delivered"
  | "archived"
  | "paused";

export type OrderTier = "basic" | "plus";

export type EventType =
  | "page_view"
  | "unlock_success"
  | "section_view"
  | "audio_play"
  | "poster_save"
  | "share_click";

export interface EventInput {
  slug: string;
  type: EventType;
  payload?: Record<string, string | number | boolean>;
}

export interface ImageManifestEntry {
  w: number;
  h: number;
  lqip: string;
}

export type ImageManifest = Record<string, ImageManifestEntry>;

export interface SectionProps<T extends Section = Section> {
  data: T;
  index: number;
  total: number;
}

export interface StoryHeroContext {
  name: string;
  birthday: string;
  tagline: string;
  cover: Photo;
  showAge: boolean;
  /** 服务端按 Asia/Shanghai 计算好的年龄文案 */
  ageText: string;
}

export interface StoryUiContext {
  slug: string;
  base: string;
  manifest: ImageManifest;
  theme: ThemeKey;
  /** 预览态：禁用分享动作 */
  preview: boolean;
  hero: StoryHeroContext | null;
}
