/**
 * 访问控制（DEV_SPEC 8.8）
 * 只使用 Web Crypto，保证 Node 与 Edge 运行时都能验签。
 */

const encoder = new TextEncoder();

export const PASS_COOKIE_PREFIX = "m_pass_";
export const ADMIN_COOKIE = "m_admin";
export const PASS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const ADMIN_TTL_MS = 12 * 60 * 60 * 1000;

export interface PassPayload {
  s: string;
  exp: number;
}

export interface AdminPayload {
  a: 1;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET 未配置");
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
}

/** 常量时间比较，避免时序侧信道 */
export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function signToken(payload: object): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await hmac(body);
  return `${body}.${toBase64Url(signature)}`;
}

async function readToken(token: string | undefined, expected: "pass" | "admin"): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const expectedSignature = await hmac(body);
    if (!timingSafeEqualBytes(expectedSignature, fromBase64Url(signature))) return null;
    const parsed: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.exp !== "number" || record.exp < Date.now()) return null;
    if (expected === "pass" && typeof record.s !== "string") return null;
    if (expected === "admin" && record.a !== 1) return null;
    return record;
  } catch {
    return null;
  }
}

export async function createPassToken(slug: string): Promise<string> {
  return signToken({ s: slug, exp: Date.now() + PASS_TTL_MS } satisfies PassPayload);
}

export async function verifyPassToken(token: string | undefined, slug: string): Promise<boolean> {
  const payload = await readToken(token, "pass");
  return payload !== null && payload.s === slug;
}

export async function createAdminToken(): Promise<string> {
  return signToken({ a: 1, exp: Date.now() + ADMIN_TTL_MS } satisfies AdminPayload);
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  return (await readToken(token, "admin")) !== null;
}

export function passCookieName(slug: string): string {
  return `${PASS_COOKIE_PREFIX}${slug}`;
}

export function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

/** 密码比较：双方先做 SHA-256，再常量时间比较（避免长度与时序泄露） */
export async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(input), sha256(expected)]);
  return timingSafeEqualBytes(a, b);
}

export async function adminPasswordMatches(input: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return passwordMatches(input, expected);
}

/* ------------------------------ 限流 ------------------------------ */

interface Bucket {
  count: number;
  resetAt: number;
  lockedUntil: number;
}

const buckets = new Map<string, Bucket>();

function hit(key: string, limit: number, windowMs: number, lockMs: number): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (bucket && bucket.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((bucket.lockedUntil - now) / 1000) };
  }
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs, lockedUntil: 0 });
    return { allowed: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    bucket.lockedUntil = now + lockMs;
    return { allowed: false, retryAfter: Math.ceil(lockMs / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

/** 同 IP + slug 5 次/60 秒；同 slug 全天 50 次锁 24 小时（X-03） */
export function checkUnlockLimit(slug: string, ip: string): { allowed: boolean; retryAfter: number } {
  const daily = hit(`unlock-day:${slug}`, 50, 24 * 60 * 60 * 1000, 24 * 60 * 60 * 1000);
  if (!daily.allowed) return daily;
  return hit(`unlock-ip:${slug}:${ip}`, 5, 60 * 1000, 60 * 1000);
}

export function checkAdminLoginLimit(ip: string): { allowed: boolean; retryAfter: number } {
  return hit(`admin-login:${ip}`, 3, 5 * 60 * 1000, 5 * 60 * 1000);
}

export function resetLimits(): void {
  buckets.clear();
}
