# 一周岁 · 宝宝一周岁电子纪念册

一个订单 = 一份 JSON + 一个目录 + 一条链接。客户付 ¥399，48 小时内拿到一条带密码的 H5 链接、一张二维码、一张分享海报。**v1 只做电子版，不做印刷与实体相册**（见 DEV_SPEC 第 10 章）。

**完整实现规范见 [DEV_SPEC.md](./DEV_SPEC.md)，写代码前必须先读第 0 节。**

## 快速开始

```bash
pnpm install
cp .env.example .env.local     # 填 AUTH_SECRET / ADMIN_PASSWORD / PREVIEW_SECRET
pnpm prisma db push            # Prisma CLI 不读 .env.local；可先 export DATABASE_URL="file:./dev.db"
pnpm seed                      # 生成示例订单素材（content → public）
pnpm dev                       # http://localhost:3000
```

示例订单：`/s/bb-20250417`，密码 `0417`。

## 目录

| 路径 | 说明 |
|---|---|
| `DEV_SPEC.md` | 唯一的开发依据（19 章：产品 / 视觉 / 9 个组件 / 数据模型 / 架构 / API / 测试 / 9 个 PR / **93 个场景** / 应急手册 / 内容边界 / 数据生命周期） |
| `app/` | 页面与接口 |
| `components/sections/` | 9 个章节组件，与 `story.json` 一一对应 |
| `content/orders/{slug}/` | 每单的内容源与原始素材（原图永久保留） |
| `public/orders/{slug}/` | 处理后的线上资源 |
| `scripts/` | 图片管线、二维码、归档 |

## 约定

- 一次只做 `DEV_SPEC.md` 第 14 章里的一个 PR
- 提交前 `pnpm typecheck && pnpm lint && pnpm test` 必须全绿
- 文案不得硬编码，颜色只用语义 token，图片只走 `<SmartImage>`
- 不为印刷预留任何代码（路由、依赖、字段）

## 状态

- [x] PR1 脚手架与设计系统
- [x] PR2 数据层
- [x] PR3 访问控制
- [x] PR4 前四章
- [x] PR5 后五章
- [x] PR6 全局与图片管线
- [x] PR7 后台
- [x] PR8 上传与一键构建
- [x] PR9 打磨与上线

## 验证

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm build && pnpm budget        # 单页 JS ≤150KB、CSS ≤30KB、图片 ≤3.5MB
pnpm e2e                         # Playwright：密码门 / 九章 / 灯箱 / 抓周 / 建单 / 状态机
```
