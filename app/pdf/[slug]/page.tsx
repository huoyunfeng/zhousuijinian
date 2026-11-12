import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PdfDocument } from "@/components/pdf/PdfDocument";
import { PdfProvider } from "@/components/pdf/PdfProvider";
import { SITE } from "@/lib/copy";
import { isDeliveryAllowed } from "@/lib/previewAuth";
import { loadManifest, loadStory } from "@/lib/story";

interface PdfPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const getStory = cache(loadStory);

export async function generateMetadata({ params }: PdfPageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStory(slug);
  return {
    title: story ? `${story.meta.title} · PDF` : SITE.defaultTitle,
    robots: { index: false, follow: false },
  };
}

export default async function PdfPage({ params, searchParams }: PdfPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : null;

  if (!(await isDeliveryAllowed(token))) notFound();

  const story = await getStory(slug);
  if (!story) notFound();

  const manifest = loadManifest(slug);

  return (
    <div className="pdf-root" data-theme={story.theme}>
      <PdfProvider slug={slug} manifest={manifest} theme={story.theme}>
        <PdfDocument story={story} />
      </PdfProvider>
    </div>
  );
}
