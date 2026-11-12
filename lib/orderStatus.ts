import { ADMIN } from "./copy";
import type { OrderStatus } from "./types";

/** 订单状态机（DEV_SPEC 2.2） */
export const ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "paid",
  "assets",
  "building",
  "review",
  "delivered",
  "paused",
  "archived",
];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["paid", "archived"],
  paid: ["assets", "paused", "archived"],
  assets: ["building", "paused", "archived"],
  building: ["review", "archived"],
  review: ["building", "delivered", "paused", "archived"],
  delivered: ["archived"],
  paused: ["paid", "assets", "review", "archived"],
  archived: [],
};

export function isOrderStatus(value: string): value is OrderStatus {
  return value in TRANSITIONS;
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from];
}

export function transitionReason(from: OrderStatus, to: OrderStatus): string | null {
  if (from === to) return ADMIN.detail.basic.invalidTransition;
  if (TRANSITIONS[from].includes(to)) return null;
  if (to === "delivered") return ADMIN.detail.basic.deliverBlocked;
  if (from === "archived") return ADMIN.detail.basic.restoreFirst;
  return ADMIN.detail.basic.invalidTransition;
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitionReason(from, to) === null;
}
