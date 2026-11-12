import { z } from "zod";
import { VALIDATION } from "./copy";

/**
 * Zod Schema（DEV_SPEC 7.3）。
 * 必须与 lib/types.ts 的 Story 类型一一对应；文案集中在 lib/copy.ts。
 */

export const ThemeKey = z.enum(["paper-warm", "film", "minimal"]);
const Ratio = z.enum(["1:1", "4:5", "3:4", "16:9"]);
const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, VALIDATION.dateFormat);

export const LookKey = z.enum(["none", "warm", "film", "mono", "soft", "punch"]);

const photo = z.object({
  src: z.string().regex(/^[\w.-]+\.(avif|webp|jpe?g|png)$/i, VALIDATION.photoName),
  alt: z.string().max(60).default(""),
  ratio: Ratio.default("4:5"),
  look: LookKey.optional(),
});

const base = z.object({
  id: z.string().min(1),
  enabled: z.boolean().default(true),
});

export const hero = base.extend({
  kind: z.literal("hero"),
  name: z.string().min(1).max(8),
  tagline: z.string().max(24),
  birthday: DateStr,
  cover: photo,
  showAge: z.boolean().default(true),
});

export const timeline12 = base.extend({
  kind: z.literal("timeline12"),
  items: z
    .array(
      z.object({
        month: z.number().int().min(1).max(12),
        photo,
        note: z.string().min(1).max(18),
        date: z.string().max(10).optional(),
        tags: z.array(z.string().max(8)).max(3).optional(),
      }),
    )
    .min(1)
    .max(12),
});

export const growth = base.extend({
  kind: z.literal("growth"),
  points: z
    .array(
      z.object({
        month: z.number().int().min(0).max(12),
        height: z.number().positive().max(120),
        weight: z.number().positive().max(30),
      }),
    )
    .max(13),
  teeth: z.number().int().min(0).max(32).optional(),
  firsts: z.array(z.object({ label: z.string().max(12), at: z.string().max(12) })).max(8).optional(),
});

export const zhuazhou = base.extend({
  kind: z.literal("zhuazhou"),
  items: z
    .array(
      z.object({
        key: z.string().min(1).max(20),
        label: z.string().min(1).max(6),
        meaning: z.string().min(1).max(40),
        fortune: z.string().min(1).max(12),
      }),
    )
    .min(3)
    .max(9),
  result: z.object({ key: z.string(), date: DateStr }).optional(),
});

export const gallery = base.extend({
  kind: z.literal("gallery"),
  photos: z.array(photo).max(60),
  groups: z.array(z.object({ title: z.string().max(12), photos: z.array(photo) })).optional(),
});

export const letter = base.extend({
  kind: z.literal("letter"),
  from: z.string().min(1).max(10),
  to: z.string().max(10).optional(),
  title: z.string().max(20).optional(),
  body: z.string().min(10).max(800),
  signature: z.string().max(20).optional(),
  handwriting: photo.optional(),
});

export const futureLetter = base.extend({
  kind: z.literal("futureLetter"),
  title: z.string().min(1).max(20),
  unlockAt: DateStr,
  body: z.string().min(10).max(1200),
  from: z.string().min(1).max(10),
  writtenAt: z.string().max(20),
});

export const guestbook = base.extend({
  kind: z.literal("guestbook"),
  messages: z
    .array(
      z.object({
        text: z.string().min(1).max(60),
        from: z.string().min(1).max(10),
        relation: z.string().max(6).optional(),
        audio: z.string().regex(/^bless-[\w-]+\.mp3$/).optional(),
      }),
    )
    .max(40),
});

export const outro = base.extend({
  kind: z.literal("outro"),
  thanks: z.string().min(1).max(30),
  signature: z.string().min(1).max(30),
  showQr: z.boolean().default(true),
});

export const section = z.discriminatedUnion("kind", [
  hero,
  timeline12,
  growth,
  zhuazhou,
  gallery,
  letter,
  futureLetter,
  guestbook,
  outro,
]);

export const storySchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]{3,40}$/),
    kind: z.literal("baby_first_birthday"),
    theme: ThemeKey,
    meta: z.object({
      title: z.string().max(30),
      description: z.string().max(80),
      ogImage: z.string().optional(),
      look: LookKey.default("warm"),
      signature: z.string().regex(/^signature\.png$/).optional(),
    }),
    access: z.object({
      mode: z.enum(["password", "public"]).default("password"),
      password: z.string().regex(/^\d{4}$/).optional(),
      expiresAt: DateStr.optional(),
      noindex: z.boolean().default(true),
    }),
    sections: z.array(section).min(1).max(9),
  })
  .superRefine((value, ctx) => {
    const heroSection = value.sections.find((item) => item.kind === "hero");
    const future = value.sections.find((item) => item.kind === "futureLetter");
    const futureIndex = value.sections.findIndex((item) => item.kind === "futureLetter");
    if (heroSection && heroSection.kind === "hero" && future && future.kind === "futureLetter") {
      if (future.unlockAt <= heroSection.birthday) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sections", futureIndex, "unlockAt"],
          message: VALIDATION.unlockAfterBirthday,
        });
      }
    }
  });

export type ParsedStory = z.infer<typeof storySchema>;
