import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SITE } from "@/lib/copy";
import { shanghaiToday } from "@/lib/date";
import { photoKey } from "@/lib/images";
import { buildOfflineHtml } from "@/lib/offlineHtml";
import { isDeliveryAllowed } from "@/lib/previewAuth";
import { loadStory, publicOrderDir, referencedAssets } from "@/lib/story";
import type { Story } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_BUDGET = 6 * 1024 * 1024;
const HARD_LIMIT = 20 * 1024 * 1024;
const AUDIO_LIMIT = 2.5 * 1024 * 1024;

interface RenderOptions {
  story: Story;
  slug: string;
  audio: string | null;
  quality: number;
  edge: number;
  version: number;
}

async function renderOffline(options: RenderOptions) {
  const dir = publicOrderDir(options.slug);
  const images: Record<string, string> = {};
  const tasks = referencedAssets(options.story).map(async (src) => {
    const candidates = [path.join(dir, `${photoKey(src)}-lg.jpg`), path.join(dir, src)];
    const file = candidates.find((candidate) => fs.existsSync(candidate));
    if (!file) return;
    const buffer = await sharp(file)
      .rotate()
      .resize({
        width: options.edge,
        height: options.edge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: options.quality, mozjpeg: true })
      .toBuffer();
    images[src] = `data:image/jpeg;base64,${buffer.toString("base64")}`;
  });
  await Promise.all(tasks);

  const signatureFile = options.story.meta.signature
    ? path.join(dir, options.story.meta.signature)
    : null;
  if (signatureFile && fs.existsSync(signatureFile)) {
    const png = await sharp(signatureFile)
      .resize({ width: 640, withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    images["signature.png"] = `data:image/png;base64,${png.toString("base64")}`;
  }

  const imageBytes = Object.values(images).reduce((sum, uri) => sum + uri.length, 0);
  const tokensCss = fs.readFileSync(path.join(process.cwd(), "app/themes.css"), "utf8");
  const html = buildOfflineHtml({
    story: options.story,
    images,
    audio: options.audio,
    tokensCss,
    generatedAt: shanghaiToday(),
    version: options.version,
    contact: SITE.contactEmail,
  });

  return { html, imageBytes };
}

function sanitize(story: Story): Story {
  return {
    ...story,
    access: { mode: story.access.mode, expiresAt: story.access.expiresAt, noindex: true },
    sections: story.sections.map((section) =>
      section.kind === "futureLetter" ? { ...section, body: "", locked: true } : section,
    ),
  };
}

function readAudio(slug: string): string | null {
  const file = path.join(publicOrderDir(slug), "bgm.mp3");
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  if (stat.size > AUDIO_LIMIT) return null;
  return `data:audio/mpeg;base64,${fs.readFileSync(file).toString("base64")}`;
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  if (!(await isDeliveryAllowed(url.searchParams.get("token")))) {
    return new Response("Not Found", { status: 404 });
  }

  const story = await loadStory(slug);
  if (!story) return new Response("Not Found", { status: 404 });

  const clean = sanitize(story);
  const audio = readAudio(slug);
  const requested = Number(url.searchParams.get("v") ?? "1");
  const version = Number.isInteger(requested) && requested > 0 && requested < 100 ? requested : 1;

  let rendered = await renderOffline({ story: clean, slug, audio, quality: 78, edge: 1600, version });
  let note = "q78/1600";

  if (rendered.imageBytes > IMAGE_BUDGET) {
    rendered = await renderOffline({ story: clean, slug, audio, quality: 70, edge: 1200, version });
    note = "q70/1200";
  }

  let finalAudio = audio !== null;
  let audioBytes = finalAudio ? audio!.length : 0;
  if (Buffer.byteLength(rendered.html) > HARD_LIMIT && finalAudio) {
    finalAudio = false;
    audioBytes = 0;
    rendered = await renderOffline({
      story: clean,
      slug,
      audio: null,
      quality: 70,
      edge: 1200,
      version,
    });
    note = "q70/1200 · 无音频";
  }

  return new Response(rendered.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Offline-Image-Bytes": String(rendered.imageBytes),
      "X-Offline-Audio-Bytes": String(audioBytes),
      "X-Offline-Audio": finalAudio ? "1" : "0",
      "X-Offline-Quality": note,
    },
  });
}
