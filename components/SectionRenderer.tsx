import type { Section } from "@/lib/types";
import { SECTION_ANCHORS } from "@/lib/copy";
import Hero from "@/components/sections/Hero";
import Timeline12 from "@/components/sections/Timeline12";
import Growth from "@/components/sections/Growth";
import Zhuazhou from "@/components/sections/Zhuazhou";
import Gallery from "@/components/sections/Gallery";
import Letter from "@/components/sections/Letter";
import FutureLetter from "@/components/sections/FutureLetter";
import Guestbook from "@/components/sections/Guestbook";
import Outro from "@/components/sections/Outro";

interface SectionRendererProps {
  sections: Section[];
  /** story.meta.signature，仅信件章节使用 */
  signature?: string;
}

/** 章节按 story.json 的 enabled 顺序渲染（DEV_SPEC 3.3） */
export function SectionRenderer({ sections, signature }: SectionRendererProps) {
  const total = sections.length;

  return (
    <>
      {sections.map((section, index) => {
        const number = index + 1;
        const anchor = SECTION_ANCHORS[section.kind] ?? section.id;

        if (section.kind === "hero") {
          return <Hero key={section.id} data={section} index={number} total={total} />;
        }

        return (
          <section key={section.id} id={anchor} aria-labelledby={`heading-${anchor}`}>
            <div className="container-page section">
              {section.kind === "timeline12" ? (
                <Timeline12 data={section} index={number} total={total} />
              ) : null}
              {section.kind === "growth" ? <Growth data={section} index={number} total={total} /> : null}
              {section.kind === "zhuazhou" ? <Zhuazhou data={section} index={number} total={total} /> : null}
              {section.kind === "gallery" ? <Gallery data={section} index={number} total={total} /> : null}
              {section.kind === "letter" ? (
                <Letter data={section} index={number} total={total} signature={signature} />
              ) : null}
              {section.kind === "futureLetter" ? (
                <FutureLetter data={section} index={number} total={total} />
              ) : null}
              {section.kind === "guestbook" ? <Guestbook data={section} index={number} total={total} /> : null}
              {section.kind === "outro" ? <Outro data={section} index={number} total={total} /> : null}
            </div>
          </section>
        );
      })}
    </>
  );
}
