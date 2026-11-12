/**
 * 渲染策略：/s/[slug] 每次请求 SSR（理由见 DEV_SPEC 8.3）：
 * 1. 「未来信」未解锁时正文不能进入 HTML，必须在请求时判断日期
 * 2. 订单持续新增，静态化需要为新单重新构建
 * 3. 密码门在中间件层，静态页面同样需要中间件，没有额外收益
 * 4. 单页 HTML 约 20–40KB，2C2G 机器 SSR 耗时 < 8ms，不是瓶颈
 */
const requiredEnv = ["AUTH_SECRET", "ADMIN_PASSWORD", "PREVIEW_SECRET"];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0 && process.env.NODE_ENV !== "test") {
  throw new Error(`缺少必需环境变量：${missing.join(", ")}（见 .env.example）`);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/s/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/pdf/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/offline/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/orders/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
      },
    ];
  },
};

export default nextConfig;
