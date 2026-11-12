"use client";

import type { LetterSection, SectionProps } from "@/lib/types";
import { LETTER, SECTION_TITLES } from "@/lib/copy";
import { useStoryUi } from "@/components/StoryContext";
import { Signature } from "@/components/ui/Signature";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SmartImage } from "@/components/ui/SmartImage";
import { Typewriter } from "@/components/ui/Typewriter";

interface LetterProps extends SectionProps<LetterSection> {
  /** story.meta.signature：手写签名文件名（DEV_SPEC 4.10.6） */
  signature?: string;
}

export default function Letter({ data, total, signature }: LetterProps) {
  const ui = useStoryUi();
  const meta = SECTION_TITLES.letter;
  const title = data.title ?? LETTER.fallbackTitle;

  return (
    <div>
      <SectionTitle index={meta.index} title={title} subtitle={meta.subtitle} total={total} headingId="heading-letter" />

      <article className="letter__paper">
        {data.to ? <p className="label-text">{LETTER.to(data.to)}</p> : null}

        {data.handwriting ? (
          <>
            <div className="mt-4 overflow-hidden rounded-sm">
              <SmartImage photo={data.handwriting} sizes="(max-width: 768px) 90vw, 560px" />
            </div>
            <div className="letter__body">
              {data.body.split("\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </>
        ) : (
          <Typewriter text={data.body} className="letter__body" />
        )}

        {data.signature ? <p className="letter__sign">{data.signature}</p> : null}
        {!data.signature ? <p className="letter__sign">{data.from}</p> : null}
        {signature ? (
          <div className="letter__signature">
            <Signature src={`${ui.base}/${signature}`} />
          </div>
        ) : null}
      </article>
    </div>
  );
}
