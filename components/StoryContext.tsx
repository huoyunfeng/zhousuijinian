"use client";

import { createContext, useContext } from "react";
import type { StoryUiContext } from "@/lib/types";

export const StoryContext = createContext<StoryUiContext | null>(null);

export function useStoryUi(): StoryUiContext {
  const value = useContext(StoryContext);
  if (!value) throw new Error("StoryContext 未初始化");
  return value;
}
