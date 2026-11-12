import { cookies } from "next/headers";
import { ADMIN_COOKIE, passCookieName, verifyAdminToken, verifyPassToken } from "./auth";

export interface PageAccess {
  passOk: boolean;
  adminOk: boolean;
  preview: boolean;
}

/**
 * 页面访问判定：密码 Cookie 7 天有效；?preview=1 必须同时持有后台 Cookie。
 */
export async function readPageAccess(
  slug: string,
  searchParams: { preview?: string } | undefined,
): Promise<PageAccess> {
  const store = await cookies();
  const passCookie = store.get(passCookieName(slug))?.value;
  const adminCookie = store.get(ADMIN_COOKIE)?.value;

  const [passOk, adminOk] = await Promise.all([
    verifyPassToken(passCookie, slug),
    verifyAdminToken(adminCookie),
  ]);

  return {
    passOk,
    adminOk,
    preview: searchParams?.preview === "1" && adminOk,
  };
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}
