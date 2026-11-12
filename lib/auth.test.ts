import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  ADMIN_TTL_MS,
  createAdminToken,
  createPassToken,
  passwordMatches,
  timingSafeEqualBytes,
  verifyAdminToken,
  verifyPassToken,
} from "./auth";

beforeAll(() => {
  process.env.AUTH_SECRET = "unit-test-secret";
});

describe("auth", () => {
  it("密码 Cookie 只对自己 slug 有效", async () => {
    const token = await createPassToken("bb-20250417");
    expect(await verifyPassToken(token, "bb-20250417")).toBe(true);
    expect(await verifyPassToken(token, "bb-20260101")).toBe(false);
    expect(await verifyPassToken(undefined, "bb-20250417")).toBe(false);
  });

  it("签名被篡改后失效", async () => {
    const token = await createAdminToken();
    const [body, signature] = token.split(".");
    const flipped = signature.endsWith("A") ? "B" : "A";
    const tampered = `${body}.${signature.slice(0, -1)}${flipped}`;
    expect(await verifyAdminToken(token)).toBe(true);
    expect(await verifyAdminToken(tampered)).toBe(false);
  });

  it("过期后失效", async () => {
    const token = await createAdminToken();
    const now = Date.now();
    const spy = vi.spyOn(Date, "now").mockReturnValue(now + ADMIN_TTL_MS + 1000);
    expect(await verifyAdminToken(token)).toBe(false);
    spy.mockRestore();
  });

  it("常量时间比较只接受完全相同的字节", () => {
    expect(timingSafeEqualBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(timingSafeEqualBytes(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(timingSafeEqualBytes(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it("密码比较先哈希再比，长度不同也不泄露", async () => {
    expect(await passwordMatches("0417", "0417")).toBe(true);
    expect(await passwordMatches("0417", "0418")).toBe(false);
    expect(await passwordMatches("0417", "04170")).toBe(false);
  });
});
