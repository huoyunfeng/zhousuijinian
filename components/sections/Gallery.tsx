"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { GallerySection, Photo, SectionProps } from "@/lib/types";
import { GALLERY, SECTION_TITLES } from "@/lib/copy";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SmartImage } from "@/components/ui/SmartImage";

const Lightbox = dynamic(() => import("@/components/ui/Lightbox"), { ssr: false });

export default function Gallery({ data, total }: SectionProps<GallerySection>) {
  const [index, setIndex] = useState<number | null>(null);
  const meta = SECTION_TITLES.gallery;

  const groups: Array<{ title?: string; photos: Photo[] }> =
    data.groups && data.groups.length > 0 ? data.groups : [{ photos: data.photos }];
  const flat = groups.flatMap((group) => group.photos);

  return (
    <div>
      <SectionTitle index={meta.index} title={meta.title} subtitle={meta.subtitle} total={total} headingId="heading-gallery" />

      {groups.map((group, groupIndex) => (
        <div key={group.title ?? groupIndex} className="mt-6">
          {group.title ? <p className="label-text mb-3">{group.title}</p> : null}
          <div className="gallery">
            {group.photos.map((photo, photoIndex) => {
              const absoluteIndex = flat.indexOf(photo);
              return (
                <button
                  key={`${photo.src}-${photoIndex}`}
                  type="button"
                  className="gallery__item photo-frame"
                  onClick={() => setIndex(absoluteIndex)}
                  aria-label={GALLERY.itemAria(absoluteIndex + 1)}
                >
                  <SmartImage photo={photo} sizes="(max-width: 768px) 50vw, 240px" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <p className="mt-6 text-center text-xs text-ink-3">{GALLERY.end(flat.length)}</p>

      {index !== null ? (
        <Lightbox
          photos={flat}
          index={index}
          onClose={() => setIndex(null)}
          onIndexChange={setIndex}
        />
      ) : null}
    </div>
  );
}
