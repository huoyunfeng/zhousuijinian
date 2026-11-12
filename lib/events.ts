"use server";

import type { EventInput } from "./types";
import { writeEvent } from "./eventsCore";

/**
 * 客户端埋点入口。
 * 作为 Server Action 暴露，避免为埋点新增 API 路由（DEV_SPEC 5.6 / 9.3）。
 */
export async function logEvent(input: EventInput): Promise<void> {
  await writeEvent(input);
}
