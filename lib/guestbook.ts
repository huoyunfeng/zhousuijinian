import type { GuestbookMessage } from "./types";

/**
 * 祝福排序：按亲疏，不按时间（DEV_SPEC 6.8）。
 * 长辈（外婆/奶奶/外公/爷爷）→ 姑舅姨 → 平辈 → 朋友；同层保持客户给的顺序。
 */
const ELDERS = ["外婆", "奶奶", "外婆", "外公", "爷爷", "姥姥", "姥爷", "祖母", "祖父"];
const RELATIVES = ["姑姑", "姑妈", "舅舅", "姨", "姨妈", "叔叔", "伯伯", "婶婶"];
const FRIENDS = ["朋友", "同事", "同学"];

function rank(message: GuestbookMessage): number {
  const hit = (list: string[]) =>
    list.some((word) => message.from.includes(word) || message.relation?.includes(word));
  if (hit(ELDERS)) return 0;
  if (hit(RELATIVES)) return 1;
  if (hit(FRIENDS)) return 3;
  return 2;
}

export function sortMessages(messages: GuestbookMessage[]): GuestbookMessage[] {
  return messages
    .map((message, index) => ({ message, index, rank: rank(message) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.message);
}
