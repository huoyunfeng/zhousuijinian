import type { FutureLetterSection, SectionProps } from "@/lib/types";
import { FUTURE, SECTION_TITLES } from "@/lib/copy";
import { daysLeft, shanghaiToday } from "@/lib/date";
import { SectionTitle } from "@/components/ui/SectionTitle";

/** 未来信在服务端判定，锁定态正文不会进入 HTML（DEV_SPEC 3.4 / 6.7） */
export default function FutureLetter({ data, total }: SectionProps<FutureLetterSection>) {
  const meta = SECTION_TITLES.futureLetter;
  const locked = data.locked ?? false;
  const days = daysLeft(data.unlockAt, shanghaiToday());
  const showNumber = days <= 365;

  return (
    <div>
      <SectionTitle index={meta.index} title={data.title} subtitle={meta.subtitle} total={total} headingId="heading-future" />

      {locked ? (
        <div className="fl__card mt-6">
          <p className="label-text">{FUTURE.lockLabel(data.title)}</p>
          {showNumber ? (
            <>
              <p className="fl__count">{FUTURE.countdown(days)}</p>
              <p className="mt-2 text-xs text-ink-3">{FUTURE.countdownUnit}</p>
            </>
          ) : (
            <p className="fl__count">{FUTURE.longWait}</p>
          )}
          <p className="mt-4 text-xs text-ink-3">{FUTURE.lockedHint}</p>
          <p className="mt-2 text-xs text-ink-3">{FUTURE.writtenBy(data.from, data.writtenAt)}</p>
        </div>
      ) : (
        <article className="fl__card fl__card--open mt-6">
          <p className="label-text">{FUTURE.openHint}</p>
          <div className="letter__body">
            {data.body.split("\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <p className="letter__sign">{FUTURE.writtenBy(data.from, data.writtenAt)}</p>
        </article>
      )}
    </div>
  );
}
