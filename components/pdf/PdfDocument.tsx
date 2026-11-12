import clsx from "clsx";
import { SmartImage } from "@/components/ui/SmartImage";
import { WaxSeal } from "@/components/ui/WaxSeal";
import { PdfImage } from "@/components/pdf/PdfImage";
import { GrowthChart } from "@/components/pdf/GrowthChart";
import { FUTURE, GROWTH, GUESTBOOK, PDF, SECTION_TITLES, SITE, TIMELINE } from "@/lib/copy";
import { planPdfPages, type PdfLetter } from "@/lib/pdf";
import type { Story, TimelineItem } from "@/lib/types";

interface PdfDocumentProps {
  story: Story;
}

function Chrome({ name, page }: { name: string; page?: number }) {
  return (
    <>
      <div className="pdf-header">{PDF.header(name)}</div>
      {page !== undefined && page >= 3 ? (
        <div className="pdf-footer">{PDF.pageNum(page)}</div>
      ) : null}
    </>
  );
}

function BlankPage({ name, page }: { name: string; page: number }) {
  return (
    <section className="pdf-page" data-page={page}>
      <Chrome name={name} page={page} />
      <div className="pdf-body pdf-empty" />
    </section>
  );
}

function MonthCard({ item }: { item: TimelineItem }) {
  const missing = item.placeholder || !item.photo.src;
  return (
    <article>
      {missing ? (
        <div className="pdf-month__placeholder">{TIMELINE.placeholder}</div>
      ) : (
        <PdfImage photo={item.photo} className="pdf-month__photo" />
      )}
      <div className="pdf-month__head">
        <span className="pdf-month__index">{TIMELINE.monthLabel(item.month)}</span>
        <span className="pdf-month__date">{item.date ?? ""}</span>
      </div>
      <p className="pdf-month__note">{item.note}</p>
    </article>
  );
}

function LetterPage({
  letter,
  index,
  name,
  page,
  signatureSrc,
}: {
  letter: PdfLetter;
  index: number;
  name: string;
  page: number;
  signatureSrc?: string;
}) {
  const paragraphs = letter.pages[index]?.split("\n").filter((line) => line.length > 0) ?? [];
  return (
    <section className="pdf-page" data-page={page}>
      <Chrome name={name} page={page} />
      <div className="pdf-body">
        <h2 className="pdf-title">{index === 0 ? letter.title : PDF.letterContinued}</h2>
        <div className="pdf-title__rule" />
        <div className="pdf-letter">
          <div className="pdf-letter__body">
            {paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`${page}-${paragraphIndex}`} className="pdf-letter__paragraph">
                {paragraph}
              </p>
            ))}
          </div>
          {index === letter.pages.length - 1 && letter.signature ? (
            <div className="pdf-letter__end">
              {signatureSrc ? (
                <img className="pdf-letter__signature" src={signatureSrc} alt="" />
              ) : null}
              <p className="pdf-letter__sign">{letter.signature}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** 12 页传播版（DEV_SPEC 20.11）：页序固定，缺章留白 */
export function PdfDocument({ story }: PdfDocumentProps) {
  const plan = planPdfPages(story);
  const latest = plan.growth
    ? [...plan.growth.points].sort((a, b) => a.month - b.month)[plan.growth.points.length - 1]
    : undefined;
  const firsts = plan.growth?.firsts?.slice(0, 4) ?? [];

  return (
    <main className="pdf-doc">
      {/* P1 封面 */}
      <section
        className={clsx("pdf-page", plan.cover && "pdf-page--cover")}
        data-page={1}
      >
        {plan.cover ? (
          <>
            <div className="pdf-cover__photo">
              <SmartImage photo={plan.cover} fill sizes="1600px" priority />
            </div>
            <div className="pdf-cover__veil" />
          </>
        ) : (
          <div className="pdf-cover__empty" />
        )}
        <div className="pdf-cover__inner">
          <p className="pdf-cover__eyebrow">{plan.eyebrow}</p>
          <h1 className="pdf-cover__name">{plan.name}</h1>
          <p className="pdf-cover__tagline">{plan.tagline}</p>
          <p className="pdf-cover__meta">{PDF.coverMeta(plan.anniversaryText)}</p>
        </div>
        {plan.cover ? <WaxSeal className="pdf-cover__seal" char={plan.name} size={64} /> : null}
      </section>

      {/* P2 / P3 十二个月 */}
      {[0, 1].map((half) => {
        const page = 2 + half;
        const from = half === 0 ? 1 : 7;
        const to = half === 0 ? 6 : 12;
        return (
          <section key={page} className="pdf-page" data-page={page}>
            <Chrome name={plan.name} page={page} />
            <div className="pdf-body">
              <h2 className="pdf-title">{PDF.timelineTitle(from, to)}</h2>
              <div className="pdf-title__rule" />
              <div className="pdf-months">
                {plan.months[half].map((item) => (
                  <MonthCard key={item.month} item={item} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* P4 成长 */}
      <section className="pdf-page" data-page={4}>
        <Chrome name={plan.name} page={4} />
        <div className="pdf-body">
          <h2 className="pdf-title">{SECTION_TITLES.growth.title}</h2>
          <div className="pdf-title__rule" />
          {plan.growth && latest ? (
            <div className="pdf-growth">
              <div className="pdf-stats">
                <div className="pdf-stat">
                  <div className="pdf-stat__value">
                    {latest.height.toFixed(1)}
                    <span className="pdf-stat__unit">{GROWTH.unit.height}</span>
                  </div>
                  <div className="pdf-stat__label">{GROWTH.height}</div>
                </div>
                <div className="pdf-stat">
                  <div className="pdf-stat__value">
                    {latest.weight.toFixed(1)}
                    <span className="pdf-stat__unit">{GROWTH.unit.weight}</span>
                  </div>
                  <div className="pdf-stat__label">{GROWTH.weight}</div>
                </div>
                <div className="pdf-stat">
                  <div className="pdf-stat__value">
                    {plan.growth.teeth !== undefined ? plan.growth.teeth : "—"}
                    {plan.growth.teeth !== undefined ? (
                      <span className="pdf-stat__unit">{GROWTH.unit.teeth}</span>
                    ) : null}
                  </div>
                  <div className="pdf-stat__label">{GROWTH.teeth}</div>
                </div>
              </div>

              <div className="pdf-chart">
                <GrowthChart points={plan.growth.points} />
              </div>

              {firsts.length > 0 ? (
                <div className="pdf-firsts">
                  {firsts.map((item) => (
                    <div key={`${item.label}-${item.at}`} className="pdf-first">
                      <span>{item.label}</span>
                      <span className="pdf-first__at">{item.at}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="pdf-empty" />
          )}
        </div>
      </section>

      {/* P5 / P6 照片墙 */}
      {[0, 1].map((half) => {
        const page = 5 + half;
        return (
          <section key={page} className="pdf-page" data-page={page}>
            <Chrome name={plan.name} page={page} />
            <div className="pdf-body">
              <h2 className="pdf-title">{SECTION_TITLES.gallery.title}</h2>
              <div className="pdf-title__rule" />
              <div className="pdf-gallery">
                {plan.gallery[half].map((photo, index) => (
                  <PdfImage key={`${photo.src}-${index}`} photo={photo} className="pdf-gallery__cell" />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* P7–P9 信 */}
      {plan.letter
        ? plan.letter.pages.map((_, index) => (
            <LetterPage
              key={`letter-${index}`}
              letter={plan.letter!}
              index={index}
              name={plan.name}
              page={7 + index}
              signatureSrc={
                story.meta.signature ? `/orders/${story.slug}/${story.meta.signature}` : undefined
              }
            />
          ))
        : [0, 1, 2].map((index) => (
            <BlankPage key={`letter-blank-${index}`} name={plan.name} page={7 + index} />
          ))}

      {/* P10 祝福 */}
      <section className="pdf-page" data-page={10}>
        <Chrome name={plan.name} page={10} />
        <div className="pdf-body">
          {plan.guestbook && plan.guestbook.messages.length > 0 ? (
            <>
              <h2 className="pdf-title">{SECTION_TITLES.guestbook.title}</h2>
              <div className="pdf-title__rule" />
              <div className="pdf-bless">
                {plan.guestbook.messages.map((message, index) => (
                  <div key={`${message.from}-${index}`} className="pdf-bless__item">
                    <p className="pdf-bless__text">{message.text}</p>
                    <p className="pdf-bless__from">{GUESTBOOK.from(message.from, message.relation)}</p>
                  </div>
                ))}
                {plan.guestbook.total > plan.guestbook.messages.length ? (
                  <p className="pdf-bless__more">{PDF.blessOverflow(plan.guestbook.total)}</p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="pdf-empty" />
          )}
        </div>
      </section>

      {/* P11 未来信（只有信封） */}
      <section className="pdf-page" data-page={11}>
        <Chrome name={plan.name} page={11} />
        <div className="pdf-body pdf-envelope-page">
          {plan.future ? (
            <div className="pdf-envelope">
              <p className="pdf-envelope__label">{PDF.futureEnvelope}</p>
              <h2 className="pdf-envelope__title">{plan.future.title}</h2>
              <p className="pdf-envelope__date">{plan.future.unlockText}</p>
              <p className="pdf-envelope__hint">{PDF.futureHint}</p>
              <p className="pdf-envelope__from">
                {FUTURE.writtenBy(plan.future.from, plan.future.writtenAt)}
              </p>
            </div>
          ) : (
            <div className="pdf-empty" />
          )}
        </div>
      </section>

      {/* P12 尾页 */}
      <section className="pdf-page" data-page={12}>
        <Chrome name={plan.name} page={12} />
        <div className="pdf-body pdf-end-page">
          <div className="pdf-end">
            <h2 className="pdf-end__thanks">{plan.outro?.thanks ?? ""}</h2>
            <p className="pdf-end__sign">{plan.outro?.signature ?? ""}</p>
            <p className="pdf-end__contact">{PDF.contact(SITE.contactEmail)}</p>
            <p className="pdf-end__made">{PDF.madeBy}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
