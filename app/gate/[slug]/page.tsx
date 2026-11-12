import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { GateForm } from "@/components/GateForm";
import { findHeroSection, loadStory } from "@/lib/story";
import { isExpired } from "@/lib/date";
import { SITE } from "@/lib/copy";

interface GatePageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: SITE.defaultTitle,
  robots: { index: false, follow: false },
};

export default async function GatePage({ params }: GatePageProps) {
  const { slug } = await params;
  const story = await loadStory(slug);
  if (!story) notFound();
  if (isExpired(story.access.expiresAt)) redirect(`/s/${slug}/expired`);
  if (story.access.mode === "public") redirect(`/s/${slug}`);

  const hero = findHeroSection(story);
  return <GateForm slug={slug} name={hero?.name ?? ""} />;
}
