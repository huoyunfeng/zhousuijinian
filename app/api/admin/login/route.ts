import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_TTL_MS,
  adminPasswordMatches,
  checkAdminLoginLimit,
  cookieOptions,
  createAdminToken,
} from "@/lib/auth";
import { API_ERRORS } from "@/lib/copy";
import { apiError, apiOk } from "@/lib/api";

export async function POST(request: Request): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  const limit = checkAdminLoginLimit(ip);
  if (!limit.allowed) {
    return apiError("RATE_LIMITED", API_ERRORS.RATE_LIMITED, 429, undefined, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return apiError("UNAUTHORIZED", API_ERRORS.UNAUTHORIZED, 401);
  }

  if (!(await adminPasswordMatches(password))) {
    return apiError("UNAUTHORIZED", API_ERRORS.UNAUTHORIZED, 401);
  }

  const token = await createAdminToken();
  const response = apiOk({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, cookieOptions(ADMIN_TTL_MS));
  return response;
}
