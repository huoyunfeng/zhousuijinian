# 离线交付能力规格（PR6 PDF + PR7 单文件 HTML）

> 依据：`DEV_SPEC.md` 第 20 章（20.3–20.11）、4.10.2、4.10.7、第 0 章执行约定。
> 目标：解决「客户没有域名」的交付问题——**PDF 负责传播，单文件 HTML 负责长期保存**。
> 现有 A 方案（密码门 / 后台 / 二维码）保留不动，作为附加能力。

---

## 1. 现状与范围

### 1.1 已完成
- 数据层：`lib/schema.ts`（Zod）、`lib/story.ts`（normalize / loadStory / referencedAssets）、`lib/types.ts`。
- 渲染层：九章组件、`StoryShell`、`SmartImage`、三套主题 token（`app/themes.css`）。
- 构建：`scripts/assets.ts` 已产出 `public/orders/{slug}/` 下 `-lg.jpg`（长边 1600）、`-md.webp`、`-sm.webp`、`manifest.json`；示例订单 `bb-20250417` 资源齐全。

### 1.2 本次范围（两个 PR，按顺序执行）
| PR | 产物 | 命令 | 验收 |
|---|---|---|---|
| PR6 | `out/{slug}/{小名}的一周岁.pdf`，12 页，1080×1920 | `pnpm pdf --slug=...` | 12 页、≤8MB、文字可选中 |
| PR7 | `out/offline/{slug}/{小名}的一周岁.html`，单文件 | `pnpm offline --slug=...` | 断网可开、无外链、无未来信正文、≤12MB |

### 1.3 明确不做（留给后续阶段，不在本次改动）
- v1.7 抓周重做（红布场景 / 手绘 SVG / WebAudio / 方印）
- v1.8 `lib/looks.ts` 六种风格配方
- v1.9 质感升级包中的多数量项（曝光归一、相纸白边、火漆印、纸张纹理、暗角、手写签名、首字下沉、动效）
- 打印版 A4 / 抓周证书 / 经折装（20.11 的附加件）
- 删除现有 A 方案（密码门 / 后台 / 线上链接）

### 1.4 本次采用的 4.10 子集（只做能在 PDF 里稳定落地的两条）
- **4.10.2**：PDF 照片不用相纸白边，改 `0.5pt` 发丝线框 + `4%` 投影。
- **4.10.7**：页眉 `{小名} · 一周岁` 8pt、距上 12mm；页脚 `— 03 —` 8pt、距下 10mm；**从 P3 开始编号**，P1 不显示页眉页脚。
- 不引入装饰性位图/纹理，避免 PDF 体积与打印失真。

---

## 2. 共享设计决策

### 2.1 文件与命令命名
- PDF：`out/{slug}/{name}的一周岁.pdf`（`out/` 已在 `.gitignore`）。
- HTML：`out/offline/{slug}/{name}的一周岁.html`。
- 文件名清洗：去掉空格、括号、emoji、路径分隔符；为空时回退 `宝宝`。
- `package.json` 新增：`"pdf": "node scripts/pdf.ts"`、`"offline": "node scripts/offline.ts"`。
- 脚本统一从 `.env.local` 读取 `PREVIEW_SECRET`、`SITE_URL`、`PORT`；允许 `--base=` 覆盖；不打印密钥。

### 2.2 鉴权（构建期内部路由，不对外）
- 新增 `lib/previewAuth.ts`：`isDeliveryAllowed(searchParams)`。
  - `?token=` 与 `process.env.PREVIEW_SECRET` 全等 → 允许（供脚本使用）。
  - 或后台 Cookie 校验通过（`verifyAdminToken`）→ 允许（供人工浏览器预览）。
  - 否则返回 false，路由直接 `notFound()`（404，不泄露订单是否存在）。
- `/pdf/[slug]`、`/offline/[slug]` 均 `export const dynamic = "force-dynamic"`，且响应头 `X-Robots-Tag: noindex, nofollow`。
- `middleware.ts` 不新增 matcher（当前只匹配 `/admin`），路由内部鉴权。

### 2.3 数据来源与「未来信」
- 唯一数据源仍是 `content/orders/{slug}/story.json`，通过 `loadStory()` 读取（走 Zod 校验 + normalize）；图片走 `loadManifest()` + `referencedAssets()`。
- **未来信正文在交付物中一律不出现**：
  - PDF：P11 只使用 `title / unlockAt / from / writtenAt`，**不读取 `body`**。
  - HTML：构建前显式把 `futureLetter.body` 置空，`window.__STORY__` 中也没有正文。
- 离线包不含：密码门、分享海报、二维码分享、在线解锁、埋点。

### 2.4 文案
- 所有新增中文文案集中在 `lib/copy.ts` 的 `PDF` 与 `OFFLINE` 两个常量对象；组件、路由、脚本内不得出现中文字符串。

---

## 3. PR6：PDF 生成

### 3.1 新增/修改文件
| 文件 | 作用 |
|---|---|
| `lib/pdf.ts`（新） | 纯函数：`planPdfPages(story)`、`splitLetter(body, 3)`、`pdfFileName(name)` |
| `app/pdf/layout.tsx`（新） | 引入 `app/pdf/pdf.css`（全局打印样式） |
| `app/pdf/pdf.css`（新） | `@page`、`.pdf-page`、页眉页脚、照片线框、排版 |
| `app/pdf/[slug]/page.tsx`（新） | 服务端读取 story + manifest + 鉴权，渲染 `PdfDocument` |
| `components/pdf/PdfDocument.tsx`（新，client） | 用 `StoryContext.Provider` 包裹，按 `planPdfPages` 渲染 12 页 |
| `components/pdf/PdfImage.tsx`（新，client） | 唯一图片出口：`SmartImage` + `sizes="1600px"` + 发丝线框容器 |
| `components/pdf/GrowthChart.tsx`（新） | 静态 SVG 成长曲线（身高），无动画 |
| `scripts/pdf.ts`（新） | Playwright 打开 `/pdf/{slug}?token=...` 并打印 |
| `package.json` | 新增 `pdf` 脚本 |

### 3.2 `lib/pdf.ts` 契约
```ts
export interface PdfPlan {
  name: string;                 // 小名（页眉/封面）
  birthdayText: string;         // 2025.04.17
  anniversaryText: string;      // 2026.04.17（birthday + 1 年）
  hero: HeroSection | null;
  months: [TimelineItem[], TimelineItem[]];        // 1–6 / 7–12（不足 12 补 placeholder）
  growth: GrowthSection | null;
  gallery: [Photo[], Photo[]];                     // 每页 9 张
  letter: { title: string; from: string; to?: string; pages: string[] } | null; // 恒 3 段
  guestbook: { messages: GuestbookMessage[]; total: number } | null; // messages 最多 12
  future: { title: string; unlockText: string; from: string; writtenAt: string } | null;
  outro: OutroSection | null;
}
export function planPdfPages(story: Story): PdfPlan;
export function splitLetter(body: string, pages?: number): string[];
export function pdfFileName(name: string, version?: number): string;
```
规则：
- 12 页固定：P1 封面、P2/P3 十二个月、P4 成长、P5/P6 照片墙、P7–P9 信、P10 祝福、P11 未来信信封、P12 尾页。
- 章节缺失（`enabled=false` 或不存在）时对应页仍输出，但为留白页（仅页眉页脚），保证「12 页顺序正确、无空白页」的验收口径是**没有意外空白**而非没有留白。
- `splitLetter`：按 `\n` 切段，按字符数均衡分 3 段，保持顺序；正文为空返回 3 个空串。
- 未来信只映射 `title/unlockAt/from/writtenAt`；类型上就不含 `body`。
- 祝福超过 12 条：取前 12 条；`total` 用于 P10 末尾「共 N 条，全部见电子版」。

### 3.3 12 页视觉规格（1080×1920 px，`box-sizing: border-box`）
| 页 | 版式 |
|---|---|
| P1 | 满版封面：`SmartImage fill` 铺满 + 上下渐变遮罩；底部小名 56px（`--font-display`）、寄语 24px、`2026.04.17 · 一周岁` 12px；无页眉页脚 |
| P2/P3 | 标题「十二个月 · 1–6 / 7–12」；3 列 × 2 行；每格照片 4:5、月份号 `01`、说明 16px、日期 11px；照片线框 + 投影 |
| P4 | 标题「长大这件事」；身高曲线 SVG（900×520）+ 三个数字（身高 / 体重 / 乳牙，48px 数字 + 12px 标签）；`firsts` 最多 4 条按两列列出 |
| P5/P6 | 标题「还有一些瞬间」；3×3 方格，照片 `object-fit: cover`，格间距 12px，发丝线框 |
| P7–P9 | 标题（P7 用 `letter.title`，P8/P9 用 `PDF.letterContinued`）；正文 26px / 行高 2.05，段首缩进 2em；落款在 P9 右下；每页正文区不超过 1200px 高 |
| P10 | 标题「他们想对你说」；12 条两列卡片，每条 20px 正文 + 12px 署名；若 `total>12` 末尾一行 `PDF.blessOverflow(total)` |
| P11 | 信封：居中 720×900 米白纸 + 虚线描边；标题、`2043.04.17`（36px `--font-num`）、`PDF.futureHint`、`from · writtenAt`；**无正文** |
| P12 | 尾页：`thanks` 40px、`signature` 18px、`SITE.contactEmail`、`OUTRO.footer.madeBy`；页脚处 `PDF.madeNote` |

页眉页脚（P2–P12）：
- 页眉：`position:absolute; top:12mm`，字号 `8pt`，颜色 `var(--c-ink-3)`，左文右空。
- 页脚：`position:absolute; bottom:10mm; left/right:0; text-align:center`，字号 `8pt`，`PDF.pageNum(n)`；P2 无页码，P3 起为 `— 03 —`。
- 安全边距：左右 `72px`，上 `120px`，下 `96px`。

照片框架（4.10.2）：`outline: 0.5pt solid rgba(0,0,0,.12)` + `box-shadow: 0 2px 8px rgba(0,0,0,.04)`，`border-radius: 2px`。

### 3.4 `app/pdf/[slug]/page.tsx`
- `params.slug` → `isValidSlug` → `loadStory`；`notFound()` 兜底。
- `searchParams` 交给 `isDeliveryAllowed`。
- `loadManifest(slug)` 注入 `StoryContext`；`base = /orders/{slug}`。
- 渲染 `<div className="pdf-root" data-theme={story.theme}><PdfDocument story={story} manifest={manifest} /></div>`。
- `generateMetadata`：`robots: { index: false, follow: false }`，标题 `story.meta.title`。

### 3.5 `scripts/pdf.ts`
1. 解析 `--slug=`，必填；`--base=` 可选，默认 `http://localhost:${PORT ?? 3000}`。
2. 读取 `.env.local`（存在时）补 `PREVIEW_SECRET`；读取 `content/orders/{slug}/story.json` 取小名与 `name` 清洗。
3. `chromium.launch()` → `newPage({ viewport: { width: 1080, height: 1920 } })` → `goto(${base}/pdf/${slug}?token=${secret}, { waitUntil: "networkidle" })`。
4. `page.pdf({ path, width: "1080px", height: "1920px", printBackground: true, margin: 0 })`。
5. 断言：
   - 文件存在且 `≤ 8MB`；
   - 字节串（latin1）匹配 `/\/Type\s*\/Pages[\s\S]{0,400}?\/Count\s+(\d+)/` 得到 `12`；
   - 含 `/Font` 关键字（文字为真文字，非整页位图）。
6. 输出摘要；失败时 `process.exit(1)`。

---

## 4. PR7：单文件离线 HTML

### 4.1 新增/修改文件
| 文件 | 作用 |
|---|---|
| `lib/offlineHtml.ts`（新） | 纯函数 `buildOfflineHtml(input)`：拼装单文件 HTML |
| `app/offline/[slug]/route.ts`（新） | Node 路由：鉴权、读 story、图片转 JPEG+base64、音频限额、返回 HTML |
| `scripts/offline.ts`（新） | 调路由、写文件、跑预算与内容断言 |
| `lib/copy.ts` | 新增 `OFFLINE` 文案与 `PDF` 文案 |
| `package.json` | 新增 `offline` 脚本 |
| `app/robots.ts` | `Disallow: /pdf/`、`/offline/` |

### 4.2 `buildOfflineHtml` 输入契约
```ts
export interface OfflineInput {
  story: Story;                        // futureLetter.body 已置空
  images: Record<string, string>;      // 文件名 → data:image/jpeg;base64,...
  audio: string | null;                // data:audio/mpeg;base64,... 或 null
  tokensCss: string;                   // app/themes.css 原文
  generatedAt: string;                 // YYYY-MM-DD
  version: number;                     // 默认 1
  contact: string;                     // SITE.contactEmail
}
export function buildOfflineHtml(input: OfflineInput): string;
```
输出要求：
- `<!doctype html>` + `<html lang="zh-CN" data-theme="{story.theme}">`，`<meta charset>`、`<meta name="viewport">`。
- 单个 `<style>`（tokensCss + 布局/组件样式），单个 classic `<script>`（IIFE，**不含 `type="module"`**）。
- `window.__STORY__ = {...}` 内联，未来信正文已为空；JSON 中 `<` 转义为 `\u003c`。
- 所有图片为 `data:`；无 `http://` / `https://`（包括 SVG 命名空间不写）。
- 页脚：`生成于 {generatedAt} · 第 {version} 版`、内容清单（实际启用的章节名）、`联系我们：{contact}`；音频未内联时追加「音乐未包含」。
- HTML 转义：所有文本经 `escapeHtml`。

### 4.3 离线页内容与交互（20.4）
| 区块 | 是否包含 | 交互 |
|---|---|---|
| 封面 | ✅ | 无 |
| 十二个月 | ✅ | 无（2 列网格） |
| 成长 | ✅ | 无（数字 + 静态 SVG） |
| 抓周 | ✅ | 点击物品 → 显示 `fortune` 结果卡；「再抓一次」重置 |
| 照片墙 | ✅ | 点击大图 → 简易灯箱（上一张/下一张/关闭） |
| 父母信 | ✅ | 无 |
| 未来信 | ✅ 仅信封 | 显示解锁日期与「正文不在此文件中」说明 |
| 亲友祝福 | ✅ 全部 | 无 |
| 结尾 | ✅ | 无分享、无 QR |
| 章节导航 | ✅ | 右侧圆点锚点 + `IntersectionObserver` 高亮 |
| 音乐 | 条件 | `≤2.5MB` 才内联；单个播放/暂停按钮 |

### 4.4 `app/offline/[slug]/route.ts`
- `isDeliveryAllowed` → `loadStory` → 深拷贝并置空 `futureLetter.body`。
- 图片：对 `referencedAssets(story)` 逐个找 `public/orders/{slug}/{key}-lg.jpg`（不存在则回退原文件名）；`sharp(...).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer()` → base64。
- 音频：`public/orders/{slug}/bgm.mp3`，`≤ 2.5MB` → `data:audio/mpeg;base64,...`，否则 `null`。
- `tokensCss = fs.readFileSync(path.join(process.cwd(), "app/themes.css"), "utf8")`。
- 返回头：`Content-Type: text/html; charset=utf-8`、`Cache-Control: no-store`、`X-Robots-Tag: noindex, nofollow`。
- 失败（slug 非法/不存在）→ `notFound()`。

### 4.5 `scripts/offline.ts`
1. `--slug=` 必填，`--version=` 可选（默认 1），`--base=` 可选。
2. `fetch(${base}/offline/${slug}?token=...&v=${version})`；非 200 直接失败。
3. 写 `out/offline/{slug}/{name}的一周岁.html`（先 `mkdir -p`）。
4. 断言：
   - `≤12MB`（>20MB 失败）；
   - `includes("http://") || includes("https://")` → 失败；
   - `<script type="module"` → 失败；
   - `window.__STORY__` 存在；
   - 未来信 `body`（去空白后）不出现在 HTML 中；
   - 含 `2043.04.17`（取 `unlockAt` 点分格式）与 `第 1 版`。
5. 输出摘要：文件路径、总大小、图片体积、HTML 体积、音频是否包含。

### 4.6 离线版预算（20.7）
- 总大小 `≤12MB`（硬上限 20MB）；图片 `≤6MB`；`HTML+CSS+JS ≤300KB`。
- 超限策略（脚本内实现）：先 `quality 70` → 再 `1200px` → 最后丢弃音频；每次降级打印原因。

---

## 5. 测试与验收

### 5.1 单元测试（Vitest）
新增 `lib/pdf.test.ts`：
- `planPdfPages` 恒为 12 页结构；月份 1–6 / 7–12；照片墙 9/9；祝福最多 12 条且 `total` 正确。
- 未来信 plan 不含 `body` 字段；正文关键词不出现在序列化结果中。
- `splitLetter` 3 段、顺序保持、空正文返回 3 段空串。
- `pdfFileName` 清洗空格/括号/emoji。

新增 `lib/offlineHtml.test.ts`：
- 输出不含 `http://`/`https://`、不含 `type="module"`。
- 未来信正文关键词搜不到；含解锁日期。
- 页脚含生成日期与版本号；启用章节清单正确。
- JSON 中 `</script>` 被转义。

### 5.2 构建验证（按序执行，每步通过再下一步）
```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```
> `next.config.mjs` 要求 `AUTH_SECRET / ADMIN_PASSWORD / PREVIEW_SECRET`；`.env.local` 已存在，构建沿用。

### 5.3 实机验收（示例订单 `bb-20250417`）
1. 确认 dev server 可用（`GET /api/health`）；未运行时后台启动 `corepack pnpm dev`。
2. `corepack pnpm pdf --slug=bb-20250417`
   - 12 页、1080×1920、≤8MB；
   - 用 Playwright/脚本检查：P1 封面、P2–P3 各 6 张、P5–P6 各 9 张、P11 无正文；
   - 文字可选中（`/Font` 存在，且页面文本包含「小满」）。
3. `corepack pnpm offline --slug=bb-20250417`
   - 单文件、无外链、无未来信正文、含版本页脚；
   - 断网可用性由「零外链 + 全内联」静态断言保证。
4. 汇报结果：产物路径、文件大小、12 页清单、离线包体积构成；再询问是否继续 v1.7/v1.8/v1.9。

---

## 6. 风险与已知取舍
- **字体**：PDF 使用系统中文字体（Songti/PingFang/SimSun）；Chromium 嵌入子集，文字可选中。若构建机缺少中文字体，P1–P12 会回退 sans-serif——记录 `fc-list` 结果作为排查依据。
- **AVIF 兼容**：PDF 由 Chromium 渲染，AVIF 可用；离线包强制 JPEG（20.6）。
- **离线包体积**：30 张 × 1600px JPEG q78 base64 后约 3–5MB，加音频 0.2MB，低于 12MB。
- **修复范围**：只新增离线交付链路；不改现有 `/s`、后台、密码门行为。
- **DEV_SPEC 文档**：不改仓库内 `DEV_SPEC.md`（工作区版本较旧），实现以第 20 章为准。

---

## 7. 需要确认的决策（默认值已写入，可修改）
1. **P1 不显示页眉页脚**（满版封面更干净），P2 有页眉无页码，P3 起页码。
2. **缺失章节保留留白页**，确保恒为 12 页。
3. **离线包不含 QR/分享/密码门**，与 20.4 一致。
4. **本次不做火漆印/纹理/签名**，留到 v1.9 批次。
