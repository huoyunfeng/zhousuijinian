import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";

/**
 * 后台页面鉴权。
 * 说明：/s/[slug] 的访问控制在页面（Node 运行时）内完成——中间件运行在 Edge，
 * 无法读取 content/ 下的 story.json 判断 public/expired；页面守卫与之等价，
 * 且未解锁时服务端不会把正文与照片写入 HTML。
 */
export const config = { matcher: ["/admin/:path*"] };

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const ok = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
  if (ok) return NextResponse.next();

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
