"use client";

import { useEffect, useRef, useState } from "react";
import { m } from "framer-motion";
import type { GuestbookMessage, GuestbookSection, SectionProps } from "@/lib/types";
import { GUESTBOOK, SECTION_TITLES } from "@/lib/copy";
import { useStoryUi } from "@/components/StoryContext";
import { SectionTitle } from "@/components/ui/SectionTitle";

const COLLAPSED = 6;

export default function Guestbook({ data, total }: SectionProps<GuestbookSection>) {
  const ui = useStoryUi();
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [failed, setFailed] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const meta = SECTION_TITLES.guestbook;
  const visible = expanded ? data.messages : data.messages.slice(0, COLLAPSED);
  const hasMore = data.messages.length > COLLAPSED;

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const stop = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(null);
  };

  const play = (index: number, message: GuestbookMessage) => {
    if (!message.audio) return;
    if (playing === index) {
      stop();
      return;
    }
    setFailed(null);
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.onended = () => setPlaying(null);
    audio.onerror = () => {
      setPlaying(null);
      setFailed(index);
    };
    audio.src = `${ui.base}/${message.audio}`;
    setPlaying(index);
    void audio.play().catch(() => {
      setPlaying(null);
      setFailed(index);
    });
  };

  return (
    <div>
      <SectionTitle index={meta.index} title={meta.title} subtitle={meta.subtitle} total={total} headingId="heading-bless" />

      <ul className="mt-6 space-y-3">
        {visible.map((message, index) => (
          <m.li
            key={`${message.from}-${index}`}
            className="bless__item"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: Math.min(index, 5) * 0.05 }}
          >
            <p className="bless__text">{message.text}</p>
            {message.audio ? (
              <button
                type="button"
                className="bless__audio"
                onClick={() => play(index, message)}
                aria-pressed={playing === index}
                aria-label={playing === index ? GUESTBOOK.playing(message.from) : GUESTBOOK.listen(message.from)}
              >
                {playing === index ? (
                  <>
                    <span className="bless__bars" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span>{GUESTBOOK.playing(message.from)}</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">▶</span>
                    <span>{GUESTBOOK.listen(message.from)}</span>
                  </>
                )}
              </button>
            ) : null}
            {failed === index ? <p className="bless__audio-error">{GUESTBOOK.audioFailed}</p> : null}
            <p className="bless__from">{GUESTBOOK.from(message.from, message.relation)}</p>
          </m.li>
        ))}
      </ul>

      {hasMore ? (
        <div className="mt-5 text-center">
          <button
            type="button"
            className="btn-outline"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? GUESTBOOK.collapse : GUESTBOOK.expand(data.messages.length)}
          </button>
        </div>
      ) : null}
    </div>
  );
}
