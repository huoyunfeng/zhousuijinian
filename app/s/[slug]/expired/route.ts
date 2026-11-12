import { EXPIRED, SITE } from "@/lib/copy";

/** 归档页：必须返回 410，且不依赖 JS（DEV_SPEC 2.3 / 8.7） */
export const dynamic = "force-dynamic";

const HTML = `<!doctype html>
<html lang="zh-CN" data-theme="paper-warm">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${EXPIRED.title} · ${SITE.name}</title>
<style>
  :root { --bg:#FBF7F0; --surface:#FFFFFF; --ink:#2B2622; --ink2:#6B625A; --ink3:#9C9289; --line:#E7DED2; --accent:#A6503C; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg); color:var(--ink);
    font-family:-apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif; padding:24px; }
  main { max-width:420px; text-align:center; }
  h1 { font-family:"Songti SC","STSong","SimSun",serif; font-weight:500; font-size:26px; margin:0 0 12px; }
  p { color:var(--ink2); font-size:14px; line-height:1.9; margin:0 0 8px; }
  .line { width:40px; height:1px; background:var(--line); margin:28px auto; }
  a { color:var(--accent); font-size:13px; text-decoration:none; }
  .mail { color:var(--ink3); font-size:12px; }
</style>
</head>
<body>
<main>
  <h1>${EXPIRED.title}</h1>
  <p>${EXPIRED.body}</p>
  <div class="line"></div>
  <p class="mail">${EXPIRED.contact}：${SITE.contactEmail}</p>
  <p><a href="/">${EXPIRED.backHome}</a></p>
</main>
</body>
</html>`;

export function GET(): Response {
  return new Response(HTML, {
    status: 410,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
