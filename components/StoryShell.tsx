"use client";

import { useRef, type ReactNode } from "react";
import { LazyMotion } from "framer-motion";
import type { ImageManifest, Story, StoryHeroContext } from "@/lib/types";
import { StoryContext } from "@/components/StoryContext";
import { AmbientAudio } from "@/components/ui/AmbientAudio";
import { SectionNav, type NavItem } from "@/components/ui/SectionNav";
import { PreviewBadge } from "@/components/PreviewBadge";

const loadMotionFeatures = () => import("@/components/motionFeatures").then((module) => module.default);

interface StoryShellProps {
  story: Story;
  manifest: ImageManifest;
  preview: boolean;
  hero: StoryHeroContext | null;
  nav: NavItem[];
  children: ReactNode;
}

/** 主题、全局悬浮件与上下文的唯一来源（DEV_SPEC 3.3） */
export function StoryShell({ story, manifest, preview, hero, nav, children }: StoryShellProps) {
  const bgmRef = useRef<string | null>(null);
  const base = `/orders/${story.slug}`;
  if (bgmRef.current === null) bgmRef.current = `${base}/bgm.mp3`;

  return (
    <StoryContext.Provider
      value={{ slug: story.slug, base, manifest, theme: story.theme, preview, hero }}
    >
      <div data-theme={story.theme} className="story-root">
        <LazyMotion features={loadMotionFeatures} strict>
          <AmbientAudio src={bgmRef.current} slug={story.slug} />
          <SectionNav items={nav} />
          {children}
          {preview ? <PreviewBadge /> : null}
        </LazyMotion>
      </div>
    </StoryContext.Provider>
  );
}
