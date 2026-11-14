"use client";

import { useEffect, useState } from "react";
import type { OutroSection, Photo, SectionProps } from "@/lib/types";
import { OUTRO, POSTER } from "@/lib/copy";
import { dottedDate } from "@/lib/date";
import { imageSources, photoKey } from "@/lib/images";
import { logEvent } from "@/lib/events";
import { useStoryUi } from "@/components/StoryContext";
import { SmartImage } from "@/components/ui/SmartImage";
import { ImageResultModal } from "@/components/ui/ImageResultModal";
import { WaxSeal } from "@/components/ui/WaxSeal";

const QR_PHOTO: Photo = { src: "qr.png", alt: OUTRO.qrAlt, ratio: "1:1" };

export default function Outro({ data }: SectionProps<OutroSection>) {
  const ui = useStoryUi();
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (posterUrl) URL.revokeObjectURL(posterUrl);
    };
  }, [posterUrl]);

  const savePoster = async () => {
    const hero = ui.hero;
    if (!hero || !hero.cover.src || busy) return;
    setBusy(true);
    setError("");
    try {
      const canvas = document.createElement("canvas");
      const { drawPoster, loadPosterImages } = await import("@/lib/poster");
      const images = await loadPosterImages(
        imageSources(ui.base, hero.cover.src, ui.manifest[photoKey(hero.cover.src)]?.v).jpg,
        `${ui.base}/qr.png`,
      );
      drawPoster(canvas, {
        cover: images.cover,
        qr: images.qr,
        name: hero.name,
        dateLine: OUTRO.dateLine(dottedDate(hero.birthday)),
        tagline: hero.tagline,
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("blob");
      const url = URL.createObjectURL(blob);
      void logEvent({ slug: ui.slug, type: "poster_save", payload: { kind: "share" } });
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      if (mobile) {
        setPosterUrl(url);
      } else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${ui.slug}-poster.jpg`;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch {
      setError(POSTER.failed);
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    void logEvent({ slug: ui.slug, type: "share_click" });
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="outro">
      <p className="outro__sign">{OUTRO.sign}</p>
      <h2 className="outro__thanks">{data.thanks}</h2>
      <p className="mt-3 font-body text-sm text-ink-2">{data.signature}</p>

      <WaxSeal char={(ui.hero?.name ?? data.signature).slice(0, 1)} size={84} className="outro__seal" />

      <div className="outro__actions">
        {ui.hero?.cover.src ? (
          <button type="button" className="btn-outline" onClick={() => void savePoster()} disabled={busy}>
            {busy ? POSTER.hintDesktop : OUTRO.savePoster}
          </button>
        ) : null}
        {ui.preview ? null : (
          <button type="button" className="btn-outline" onClick={() => void share()}>
            {copied ? OUTRO.shareFallback : OUTRO.share}
          </button>
        )}
      </div>
      {error ? <p className="mt-3 text-xs text-accent">{error}</p> : null}

      {data.showQr ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="w-[132px] overflow-hidden rounded-sm bg-surface p-2">
            <SmartImage photo={QR_PHOTO} sizes="132px" />
          </div>
          <p className="text-xs text-ink-3">{OUTRO.qrHint}</p>
        </div>
      ) : null}

      <div className="outro__footer">
        <span className="only-family">{OUTRO.footer.family}</span>
        <span aria-hidden="true">·</span>
        <span>{OUTRO.footer.madeBy}</span>
        <span aria-hidden="true">·</span>
        <span className="num">{OUTRO.footer.year}</span>
      </div>

      {posterUrl ? (
        <ImageResultModal
          src={posterUrl}
          alt={POSTER.alt}
          hint={POSTER.hintMobile}
          onClose={() => {
            URL.revokeObjectURL(posterUrl);
            setPosterUrl(null);
          }}
        />
      ) : null}
    </div>
  );
}
