# 实施任务清单（PR6 → PR7）

> 规则：一次只做一个任务；每个 PR 结束跑 `typecheck / lint / test`；不新增依赖；不写 `any`；中文文案只进 `lib/copy.ts`。

## PR6 · PDF（传播层）

- [x] **T1 文案与纯函数**
  - `lib/copy.ts` 新增 `PDF`：`header(name)`、`pageNum(n)`、`letterContinued`、`blessOverflow(total)`、`futureHint`、`madeNote`、`timelineTitle(from,to)`、`growthTitle`、`galleryTitle`、`blessTitle`、`coverMeta(date)`。
  - 新建 `lib/pdf.ts`：`PdfPlan`、`planPdfPages(story)`、`splitLetter(body, 3)`、`pdfFileName(name, version?)`。
  - 验收：`planPdfPages` 输出恒 12 页所需数据；未来信无 `body`。
- [x] **T2 打印样式**
  - 新建 `app/pdf/layout.tsx`（import `./pdf.css`）。
  - 新建 `app/pdf/pdf.css`：`@page { size: 1080px 1920px; margin: 0 }`、`.pdf-page` 固定尺寸与分页、页眉页脚、发丝线框、封面遮罩、留白页。
- [x] **T3 12 页组件**
  - `components/pdf/PdfDocument.tsx`（client，`StoryContext.Provider`）。
  - `components/pdf/PdfImage.tsx`（`SmartImage` + `sizes="1600px"`）。
  - `components/pdf/GrowthChart.tsx`（静态 SVG）。
  - 按 spec 3.3 实现 P1–P12。
- [x] **T4 PDF 路由**
  - 新建 `lib/previewAuth.ts`（token / 后台 Cookie 二选一）。
  - 新建 `app/pdf/[slug]/page.tsx`：鉴权、`loadStory`、`loadManifest`、`notFound`、noindex。
- [x] **T5 打印脚本**
  - 新建 `scripts/pdf.ts`：读 `.env.local`、Playwright 打印、8MB/12 页/字体断言。
  - `package.json` 增加 `"pdf": "node scripts/pdf.ts"`。
- [x] **T6 测试与验证**
  - `lib/pdf.test.ts`（12 页结构、6/6、9/9、12 条祝福、未来信无正文、信分 3 段、文件名清洗）。
  - 跑 `typecheck / lint / test / build`。
  - 对 `bb-20250417` 执行 `pnpm pdf`，记录路径、大小、页数。

## PR7 · 单文件 HTML（保存层）

- [x] **T7 文案与构建器**
  - `lib/copy.ts` 新增 `OFFLINE`：`footer(generatedAt, version)`、`contents`、`contact`、`audioMissing`、`futureBodyOmitted`、`lightbox` 控件文案、`nav`。
  - 新建 `lib/offlineHtml.ts`：`OfflineInput`、`buildOfflineHtml`（全内联、classic IIFE、`window.__STORY__`、未来信仅信封、页脚清单）。
- [x] **T8 离线路由**
  - 新建 `app/offline/[slug]/route.ts`：鉴权、置空未来信正文、sharp → JPEG q78/1600、音频 ≤2.5MB、内联 `app/themes.css`、no-store。
  - `app/robots.ts` 增加 `/pdf/`、`/offline/`。
- [x] **T9 导出脚本**
  - 新建 `scripts/offline.ts`：fetch 路由 → 写 `out/offline/{slug}/{name}的一周岁.html` → 体积/外链/未来信/版本断言 → 摘要。
  - `package.json` 增加 `"offline": "node scripts/offline.ts"`。
- [x] **T10 测试与验证**
  - `lib/offlineHtml.test.ts`（无外链、无 module、无正文、含日期版本、转义）。
  - **最终回归**：`typecheck / lint / test / build` 全绿。
  - 对 `bb-20250417` 执行 `pnpm offline`，记录路径、总大小、图片/HTML/音频构成。
  - 汇报并询问是否进入 v1.7 / v1.8 / v1.9。

## 验收口径
- PDF：12 页顺序正确、无意外空白页、文字可选中、≤8MB。
- HTML：单文件双击可开、无 `http(s)://`、未来信正文搜不到、≤12MB、页脚有生成日期与版本。
- 既有能力不回归：`/s/[slug]`、密码门、后台、现有 28 个单测与 E2E 保持通过。
