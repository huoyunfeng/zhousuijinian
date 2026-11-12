import { NextResponse, type NextRequest } from "next/server";
import {
  checkUnlockLimit,
  cookieOptions,
  createPassToken,
  PASS_TTL_MS,
  passCookieName,
  passwordMatches,
} from "@/lib/auth";
import { loadStory } from "@/lib/story";
import { isExpired } from "@/lib/date";
import { API_ERRORS } from "@/lib/copy";
import { writeEvent } from "@/lib/eventsCore";
import { apiError, apiOk } from "@/lib/api";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("SCHEMA_INVALID", API_ERRORS.SCHEMA_INVALID, 422);
  }

  const record = body as { slug?: unknown; password?: unknown };
  const slug = typeof record.slug === "string" ? record.slug : "";
  const password = typeof record.password === "string" ? record.password : "";
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || !/^\d{4}$/.test(password)) {
    return apiError("BAD_PASSWORD", API_ERRORS.BAD_PASSWORD, 401);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  const limit = checkUnlockLimit(slug, ip);
  if (!limit.allowed) {
    return apiError("RATE_LIMITED", API_ERRORS.RATE_LIMITED, 429, undefined, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  let story;
  try {
    story = await loadStory(slug);
  } catch {
    return apiError("INTERNAL", API_ERRORS.INTERNAL, 500);
  }
  if (!story) return apiError("NOT_FOUND", API_ERRORS.NOT_FOUND, 404);
  if (isExpired(story.access.expiresAt)) return apiError("GONE", API_ERRORS.GONE, 410);

  if (story.access.mode === "password") {
    const expected = story.access.password ?? "";
    const ok = expected !== "" && (await passwordMatches(password, expected));
    if (!ok) {
      return apiError("BAD_PASSWORD", API_ERRORS.BAD_PASSWORD, 401);
    }
  }

  const token = await createPassToken(slug);
  const response = apiOk({ ok: true });
  response.cookies.set(passCookieName(slug), token, cookieOptions(PASS_TTL_MS));
  await writeEvent({ slug, type: "unlock_success" });
  return response;
}
