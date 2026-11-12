import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.resolve(process.cwd(), "content/orders");
const SAMPLE = path.join(CONTENT_DIR, "bb-20250417/story.json");

export const SAMPLE_SLUG = "bb-20250417";
export const SAMPLE_PASSWORD = "0417";

export const LIMIT_SLUG = "e2e-limit";
export const EXPIRED_SLUG = "e2e-expired";
export const MISSING_MONTHS_SLUG = "e2e-months";

export type StoryRecord = Record<string, unknown>;

function readSample(): StoryRecord {
  return JSON.parse(fs.readFileSync(SAMPLE, "utf8")) as StoryRecord;
}

function section(data: StoryRecord, kind: string): Record<string, unknown> {
  const sections = data.sections as Record<string, unknown>[];
  const found = sections.find((entry) => entry.kind === kind);
  if (!found) throw new Error(`missing section ${kind}`);
  return found;
}

export function sampleFutureBody(): string {
  return String(section(readSample(), "futureLetter").body ?? "");
}

export function sampleLetterBody(): string {
  return String(section(readSample(), "letter").body ?? "");
}

export function writeStory(slug: string, mutate: (data: StoryRecord) => void): void {
  const data = readSample();
  data.slug = slug;
  mutate(data);
  fs.mkdirSync(path.join(CONTENT_DIR, slug), { recursive: true });
  fs.writeFileSync(path.join(CONTENT_DIR, slug, "story.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function removeStory(slug: string): void {
  fs.rmSync(path.join(CONTENT_DIR, slug), { recursive: true, force: true });
  fs.rmSync(path.resolve(process.cwd(), "public/orders", slug), { recursive: true, force: true });
}

export function accessOf(data: StoryRecord): Record<string, unknown> {
  return data.access as Record<string, unknown>;
}

export { section };
