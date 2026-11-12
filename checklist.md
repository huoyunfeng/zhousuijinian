# 验收清单（PR6 PDF + PR7 单文件 HTML）

## PDF
- [x] `planPdfPages` 恒输出 12 页结构（P1–P12 顺序固定），单测覆盖
- [x] 未来信页仅含 `title / unlockAt / from / writtenAt`，类型上不含 `body`
- [x] 页眉 8pt / 距上 12mm、页脚 8pt / 距下 10mm，P1 无页眉页脚，页码从 P3 开始
- [x] 照片使用 0.5pt 发丝线框 + 4% 投影，无相纸白边
- [x] `out/bb-20250417/小满的一周岁.pdf` 为 12 页、MediaBox 810×1440pt、3.3MB（≤8MB）、含 `/Font`（文字可选中）
- [x] PDF 路由 `/pdf/[slug]` 需 token 或后台 Cookie，失败 404，响应 `noindex`
- [x] `pnpm pdf --slug=...` 可复现产物并通过页数/体积/字体断言

## 单文件 HTML
- [x] 产物 `out/offline/bb-20250417/小满的一周岁.html` 为单文件，0.89MB（≤12MB）
- [x] 全文无 `http://` / `https://`，无 `<script type="module"`，仅 1 个 `<style>` + 1 个 classic `<script>`
- [x] 含 `window.__STORY__`，未来信正文不在 HTML 中，仅显示解锁日期与「这一天再打开」
- [x] 页脚含「生成于 · 第 N 版」「包含：章节清单」「联系我们」
- [x] 断网 `file://` 打开：12 个月、30 张照片、6 个抓周项、音乐存在、零外部请求、零 console error、无横向溢出
- [x] 抓周点击后展示结果与「再抓一次」；照片墙灯箱可开/关
- [x] 图片 ≤6MB；HTML+CSS+JS ≤300KB（style 9.5KB / script 8.9KB / 结构约 50–60KB）
- [x] `/offline/[slug]` 需 token 或后台 Cookie，`robots.txt` 屏蔽 `/pdf/` 与 `/offline/`

## 回归
- [x] 新增中文文案集中在 `lib/copy.ts` 的 `PDF` / `OFFLINE`
- [x] `typecheck`、`lint`、`test`（7 文件 44 用例）、`build` 全绿
- [x] 既有 `/s/[slug]`、密码门、后台、二维码链路无改动、行为不变
