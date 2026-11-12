import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StoryShell } from "@/components/StoryShell";
import { SectionRenderer } from "@/components/SectionRenderer";
import { readPageAccess } from "@/lib/guard";
import { isExpired, shanghaiToday } from "@/lib/date";
import { findHeroSection, loadManifest, loadStory } from "@/lib/story";
import { photoKey } from "@/lib/images";
import { buildHeroContext, buildNav } from "@/lib/storyView";
import { writeEvent } from "@/lib/eventsCore";
import { SITE } from "@/lib/copy";

interface StoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getStory = cache(loadStory);

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStory(slug);
  if (!story) return { title: SITE.defaultTitle };

  const hero = findHeroSection(story);
  const ogImage =
    hero && hero.kind === "hero" && hero.cover.src
      ? `/orders/${slug}/${photoKey(hero.cover.src)}-og.jpg`
      : undefined;

  return {
    title: story.meta.title,
    description: story.meta.description,
    robots: story.access.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: story.meta.title,
      description: story.meta.description,
      images: ogImage ? [ogImage] : undefined,
      type: "website",
    },
  };
}

export default async function StoryPage({ params, searchParams }: StoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const story = await getStory(slug);
  if (!story) notFound();
  if (isExpired(story.access.expiresAt)) redirect(`/s/${slug}/expired`);

  const access = await readPageAccess(slug, {
    preview: typeof query.preview === "string" ? query.preview : undefined,
  });

  if (story.access.mode === "password" && !access.passOk && !access.preview) {
    redirect(`/gate/${slug}`);
  }

  const sections = story.sections.filter((section) => section.enabled);
  const hero = buildHeroContext(story);
  const nav = buildNav(story);
  const manifest = loadManifest(slug);

  void writeEvent({
    slug,
    type: "page_view",
    payload: { preview: access.preview, day: shanghaiToday() },
  });

  return (
    <StoryShell story={story} manifest={manifest} preview={access.preview} hero={hero} nav={nav}>
      <main>
        <SectionRenderer sections={sections} signature={story.meta.signature} />
      </main>
    </StoryShell>
  );
}
