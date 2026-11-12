"use client";

import { useEffect, useRef, useState } from "react";
import type { Howl } from "howler";
import { logEvent } from "@/lib/events";
import { AUDIO } from "@/lib/copy";

interface AmbientAudioProps {
  src: string;
  slug: string;
}

/** 背景音乐：不自动播放，失败时按钮置灰（DEV_SPEC 5.4） */
export function AmbientAudio({ src, slug }: AmbientAudioProps) {
  const howlRef = useRef<Howl | null>(null);
  const [state, setState] = useState<"idle" | "playing" | "error">("idle");

  useEffect(() => {
    let disposed = false;
    let howl: Howl | null = null;

    void (async () => {
      try {
        const { Howl } = await import("howler");
        if (disposed) return;
        howl = new Howl({
          src: [src],
          loop: true,
          volume: 0.32,
          preload: true,
          onloaderror: () => setState("error"),
          onplayerror: () => setState("error"),
        });
        howlRef.current = howl;
      } catch {
        setState("error");
      }
    })();

    return () => {
      disposed = true;
      howl?.unload();
      howlRef.current = null;
    };
  }, [src]);

  // 抓周等场景音效读取该标记，只在背景音乐开启时发声（DEV_SPEC 6.4.4）
  useEffect(() => {
    document.documentElement.dataset.audio = state === "playing" ? "on" : "off";
    return () => {
      document.documentElement.dataset.audio = "off";
    };
  }, [state]);

  const toggle = () => {
    const howl = howlRef.current;
    if (!howl || state === "error") return;
    if (state === "playing") {
      howl.pause();
      setState("idle");
      return;
    }
    howl.play();
    setState("playing");
    void logEvent({ slug, type: "audio_play" });
  };

  const label = state === "error" ? AUDIO.unavailable : state === "playing" ? AUDIO.pause : AUDIO.play;

  return (
    <button
      type="button"
      className="audio-fab"
      data-state={state}
      onClick={toggle}
      disabled={state === "error"}
      aria-label={label}
      title={label}
    >
      <span className="audio-bars flex h-4 items-end gap-[3px]" aria-hidden="true">
        <span className="block h-3 w-[2px] origin-bottom rounded-full bg-ink-2" />
        <span className="block h-4 w-[2px] origin-bottom rounded-full bg-ink-2" />
        <span className="block h-2 w-[2px] origin-bottom rounded-full bg-ink-2" />
      </span>
    </button>
  );
}
