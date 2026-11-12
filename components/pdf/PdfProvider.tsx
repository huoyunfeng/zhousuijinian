"use client";

import type { ReactNode } from "react";
import { StoryContext } from "@/components/StoryContext";
import type { ImageManifest, ThemeKey } from "@/lib/types";

interface PdfProviderProps {
  slug: string;
  manifest: ImageManifest;
  theme: ThemeKey;
  children: ReactNode;
}

/** 打印页只需要图片与主题，不挂章节导航 / 音乐 / 预览水印 */
export function PdfProvider({ slug, manifest, theme, children }: PdfProviderProps) {
  return (
    <StoryContext.Provider
      value={{ slug, base: `/orders/${slug}`, manifest, theme, preview: false, hero: null }}
    >
      {children}
    </StoryContext.Provider>
  );
}
