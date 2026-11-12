"use server";

import { API_ERRORS } from "./copy";
import { isAdmin } from "./guard";
import { storySchema } from "./schema";

export interface StoryValidation {
  ok: boolean;
  errors: string[];
}

/** 内容 tab 的「校验」按钮：返回 Zod 错误路径，不落盘 */
export async function validateStoryAction(value: unknown): Promise<StoryValidation> {
  if (!(await isAdmin())) return { ok: false, errors: [API_ERRORS.UNAUTHORIZED] };
  const parsed = storySchema.safeParse(value);
  if (parsed.success) return { ok: true, errors: [] };
  return {
    ok: false,
    errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
  };
}
