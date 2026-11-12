import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken } from "./auth";

/**
 * 交付物构建路由的内部鉴权（DEV_SPEC 20.6）：
 * - 构建脚本带 ?token=PREVIEW_SECRET
 * - 人工预览沿用后台 Cookie
 * 两者都不满足时调用方直接返回 404，不泄露订单是否存在。
 */
export async function isDeliveryAllowed(token: string | null): Promise<boolean> {
  const secret = process.env.PREVIEW_SECRET;
  if (token && secret && token === secret) return true;

  const store = await cookies();
  return verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
}
