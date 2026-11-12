import fs from "node:fs";
import path from "node:path";
import type { EventInput } from "./types";

const LOG_DIR = path.resolve(process.cwd(), process.env.LOG_DIR ?? "logs");

/** 本地 JSONL 埋点（DEV_SPEC 5.6）：不记录访客身份，不接第三方 */
export async function writeEvent(input: EventInput): Promise<void> {
  try {
    const now = new Date();
    const stamp = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    await fs.promises.mkdir(LOG_DIR, { recursive: true });
    const line = JSON.stringify({
      type: input.type,
      slug: input.slug,
      payload: input.payload ?? null,
      at: now.toISOString(),
    });
    await fs.promises.appendFile(path.join(LOG_DIR, `events-${stamp}.jsonl`), `${line}\n`, "utf8");
  } catch {
    // 埋点失败不影响页面
  }
}
