import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken } from "./auth";
import { API_ERRORS } from "./copy";

export interface ApiErrorPayload {
  ok: false;
  error: { code: string; message: string; detail?: string[] };
}

export function apiOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiError(
  code: string,
  message: string,
  status: number,
  detail?: string[],
  headers?: Record<string, string>,
): NextResponse {
  const payload: ApiErrorPayload = { ok: false, error: { code, message, ...(detail ? { detail } : {}) } };
  return NextResponse.json(payload, { status, headers });
}

/** 后台 API 统一鉴权（middleware 只覆盖页面，API 自行校验） */
export async function requireAdmin(cookieValue: string | undefined): Promise<boolean> {
  return verifyAdminToken(cookieValue);
}

/** Route Handler 用：未登录直接返回 401 响应，已登录返回 null */
export async function adminGuard(): Promise<NextResponse | null> {
  const store = await cookies();
  const ok = await verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
  return ok ? null : apiError("UNAUTHORIZED", API_ERRORS.UNAUTHORIZED, 401);
}

export { ADMIN_COOKIE };
