# 宝宝一周岁电子纪念册 · 开发设计方案

> 版本 v1.1 ｜ 2026-11-10 ｜ 面向 Trae 的实现规范（Implementation Spec）
> 一个订单 = 一份 JSON + 一个目录 + 一条链接。
> **v1 只做电子版**：H5 链接 + 二维码 + 分享海报。印刷与实体相册推迟到 v2，本文档不为其写任何实现。
> 读到本文档的 Agent 应能独立完成 v1 的开发，并且**不要为 v2 提前铺代码**。

---

### 目录

- 0 给 Trae 的执行约定
- 1 产品定义
- 2 业务流程与状态机
- 3 信息架构
- 4 视觉设计系统
- 5 全局交互规范
- 6 页面与组件详细规格
- 7 数据模型
- 8 技术架构
- 9 后台与 API
- 10 暂不实现：印刷（v2）
- 11 性能、兼容、可访问性
- 12 安全与合规
- 13 测试与验收
- 14 实施计划
- 15 场景全量清单（93 个场景）
- 16 应急手册（Runbook）
- 17 内容边界与敏感场景
- 18 数据生命周期
- 19 附录

---

## 0. 给 Trae 的执行约定

**先读这一节，再动手。**

1. **一次只做一个任务。** 第 14 章把工作拆成了 9 个 PR，按顺序做，每个 PR 结束前必须跑通 `pnpm typecheck && pnpm lint && pnpm test`。
2. **不新增依赖。** 只能使用第 8.1 节列出的包。需要新包时，先在 PR 描述里写「为什么现有依赖做不到」。
3. **不硬编码文案。** 所有面向用户的文字必须来自 `story.json` 或 `lib/copy.ts`（默认文案库）。组件里出现中文字符串即视为不合规。
4. **不写 `any`。** 第三方库边界用 `unknown` + 类型守卫，其余一律显式类型。
5. **所有图片必须走 `<SmartImage>`**，禁止直接写 `<img>` 或 `next/image`（原因见 8.5）。
6. **新增页面必须同时更新**：`app` 路由、第 3.1 节路由表、`middleware.ts` 白名单、第 13.2 节测试用例。
7. **提交信息格式**：`feat(hero): 增加封面滚动淡出` / `fix(gate): 修正错误抖动时长`。一个 PR 不超过 400 行 diff。
8. **拿不准就停。** 文档没写清的地方，在 PR 里列「待确认」，不要自行发明交互。
9. **先查场景再写码。** 动手前翻一遍第 15 章，找到你要做的东西对应的场景组，P0 项逐条实现；PR 描述里写清「已覆盖 S-01、S-02」。第 15 章没有的情况，按第 8 条处理。

**项目代号**：`yizhouji`（一周岁）
**根目录约定**：仓库根 = 项目根，本文档位于 `DEV_SPEC.md`。

---

## 1. 产品定义

### 1.1 一句话

> **宝宝一周岁纪念页，扫码就能看。**

客户（妈妈）付 ¥399 起，48 小时内拿到一条链接、一张二维码、一张分享海报。v1 不提供实体相册与印刷（v2 再说），所以**交付物只有三样，且全部在线完成**：链接能打开、二维码能扫、海报能转发。

### 1.2 三个角色

| 角色 | 谁 | 要什么 | 系统里的身份 |
|---|---|---|---|
| 客户 | 宝宝妈妈 | 生日当天能打开、亲戚一扫就能看、能直接转发到家族群 | 无账号，只有订单 |
| 访客 | 亲友 | 点开就看到，不用注册，不卡 | 无身份，凭密码进入 |
| 操作者 | 你 | 30 分钟内把一单做完，不碰代码 | 后台账号（单用户） |

### 1.3 范围

**做（v1）**

- 移动端优先的单页纪念站，9 个章节，纵向滚动
- 密码门 + 禁止搜索引擎收录 + 到期自动归档
- 三套视觉主题（暖纸 / 胶片 / 极简白）
- 背景音乐（点击播放）、照片灯箱、抓周小游戏、未来信定时解锁
- 分享海报（Canvas 生成，1080×1920）、二维码
- 后台：建单、传素材、编辑 JSON、预览、交付
- 到期归档：页面下线（410），源文件打包留存；客户如需离线包，人工导出（不在 v1 自动化范围内）
- 聊天记录/情侣/年度报告等其它 SKU：**不做**，但数据模型预留 `kind` 字段

**不做（v1 明确砍掉）**

- **实体相册 / 印刷 PDF / 物流 / 打样**——整体推迟到 v2，v1 不写一行相关代码
- 小程序、App、任何需要审核的分发形态
- 在线支付（走微信/支付宝收款码 + 后台手工登记）
- 用户注册登录、多租户 SaaS、模板市场
- 访客公开留言（v1 由运营代录，避免审核与灌水；接口预留）
- AI 自动写文案、自动挑图（v2）
- 中英双语（数据结构预留 `locale`，UI 不做）

**两个档位（只有电子版，所以只有两档）**

| 档位 | `tier` | 包含 | 周期 | 价格 |
|---|---|---|---|---|
| 标准 | `basic` | 9 章纪念页 + 密码 + 二维码 + 海报 + 12 个月托管 | 48h | ¥399 |
| 尊享 | `plus` | 标准全部 + 定制域名 + 36 个月托管 + 24h 加急 | 24h | ¥599 |

**价格只是数据库里的一个数字，不参与任何逻辑判断**——改价、打折、送朋友，都不需要改代码。

### 1.4 成功标准

| 指标 | 目标 |
|---|---|
| 云页交付时长 | ≤ 48 小时（素材齐备起算） |
| 首屏（4G，中端安卓） | < 1.5s，LCP < 2.5s |
| 单页 JS（gzip） | < 150KB |
| 单页图片总量 | < 3.5MB（含 12 张月照与 30 张精选） |
| 客户修改轮次 | ≤ 2 轮 |
| 后台出一单耗时 | ≤ 30 分钟（不含等素材） |

---

## 2. 业务流程与状态机

### 2.1 主流程

```
咨询 → 报价 → 收 30% 定金 → 建单 + 发素材清单 → 客户交素材
   → 素材质检（不合格退回）→ 后台填 JSON + 传图 → 生成预览链接
   → 客户确认（≤2 轮修改）→ 收尾款 → 交付正式链接 + 二维码 + 海报
   → 7 天后回访 → 托管期满归档
```

### 2.2 订单状态机

```ts
type OrderStatus =
  | "draft"       // 已建单，未收定金
  | "paid"        // 已收定金，等素材
  | "assets"      // 素材齐备且通过质检
  | "building"    // 正在制作（填 JSON / 传图 / 生成）
  | "review"      // 预览已发，等客户确认
  | "delivered"   // 尾款已收，正式交付
  | "archived";   // 托管期满或主动归档
```

允许的迁移（后台每个按钮对应一条）：

| 从 | 到 | 触发 | 副作用 |
|---|---|---|---|
| draft | paid | 登记定金 | 生成素材清单链接 |
| paid | assets | 素材质检通过 | 解锁「生成」按钮 |
| assets | building | 点击「开始制作」 | 创建 `content/orders/{slug}/` |
| building | review | 点击「生成预览」 | 生成 `?preview=1` 链接，加水印 |
| review | building | 客户要求修改 | 记录修改轮次 +1 |
| review | delivered | 登记尾款 | 关闭水印、生成二维码与海报 |
| delivered | archived | 定时任务 / 手动 | 打包 zip，删除 `public/orders/{slug}/` |
| 任意 | archived | 手动归档 | 同上，不可逆（可从备份恢复） |

**规则**：修改轮次 > 2 时，后台弹出提示「超出部分按 ¥30/页计费」，但不阻断操作。

### 2.3 异常分支（状态机之外的真实情况）

主流程永远不会按顺序走完。下面这些岔路要能在后台一键处理，且不破坏已交付的链接。

| 分支 | 从哪个状态 | 处理 | 链接会怎样 |
|---|---|---|---|
| 客户改生日 / 改名 | 任意 | 改 JSON → 重算天数，不换 slug | 不变 |
| 客户加照片（交付后） | delivered | 加图 → 重新生成 → 记 ¥30/页 | 不变，刷新即见 |
| 客户换主题 | 任意 | 改 `theme` 字段 | 不变 |
| 客户失联 7 天 | paid | 标记 `paused`（不占排期），第 14 天再提醒 | 无 |
| 客户要求退款（未开工） | paid/assets | 全额退，状态 → `archived`，删除目录 | 无 |
| 客户要求退款（已交付） | delivered | 不退；如坚持，下线但不退款 | 410 |
| 客户要求延长托管 | delivered | 改 `expiresAt` | 不变 |
| 客户要求删除 | 任意 | 立即 410 → 24h 删资源 → 7 天清备份 | 410 |
| 监护权争议 | 任意 | 立即 410，**不删除**，等双方书面一致 | 410 |
| 交付后发现内容错误 | delivered | 改 JSON 重新生成，不算修改轮次 | 不变 |

**新增状态**：`paused`（失联/暂停）。它可以从 `paid`/`assets`/`review` 进入，也可以回到原状态；`paused` 不进排期统计，但出现在「待跟进」列表里。

**冻结规则**：`archived` 之后任何操作都需要先「恢复」，恢复会重新占用磁盘与托管期——这是防止误删的最后一层。

---

## 3. 信息架构

### 3.1 路由表

| 路由 | 类型 | 说明 | 鉴权 |
|---|---|---|---|
| `/` | 静态 | 落地页：一句介绍 + 示例链接 | 公开 |
| `/s/[slug]` | 动态 | 纪念页正文 | 密码 Cookie |
| `/gate/[slug]` | 动态 | 密码页（中间件 rewrite 到这里） | 公开 |
| `/s/[slug]/expired` | 动态 | 托管到期提示 | 公开 |
| `/admin/login` | 静态 | 后台登录 | 公开 |
| `/admin/orders` | 动态 | 订单列表 | 后台 Cookie |
| `/admin/orders/new` | 静态 | 新建订单 | 后台 Cookie |
| `/admin/orders/[slug]` | 动态 | 订单详情（4 个 tab） | 后台 Cookie |
| `/api/unlock` | Route | 校验密码、下发 Cookie | 公开 |
| `/api/admin/*` | Route | 后台接口（见 9.3） | 后台 Cookie |
| `/robots.txt` | 静态 | 全站 `Disallow: /s/` | 公开 |

### 3.2 纪念页章节（阅读动线）

| # | Section `kind` | 中文名 | 锚点 | 页面高度（移动端） |
|---|---|---|---|---|
| 1 | `hero` | 封面 | `#top` | 100dvh |
| 2 | `timeline12` | 十二个月 | `#months` | 自适应（12 屏） |
| 3 | `growth` | 成长曲线 | `#growth` | ~1.5 屏 |
| 4 | `zhuazhou` | 抓周 | `#zhuazhou` | 1 屏 |
| 5 | `gallery` | 照片墙 | `#gallery` | 自适应 |
| 6 | `letter` | 爸爸妈妈的信 | `#letter` | ~1.2 屏 |
| 7 | `futureLetter` | 给未来的一封信 | `#future` | 1 屏 |
| 8 | `guestbook` | 亲友祝福 | `#bless` | 自适应 |
| 9 | `outro` | 结尾 + 海报 | `#end` | 1 屏 |

**章节可开关**：`story.sections[].enabled` 为 `false` 时整章不渲染，锚点导航同步隐藏，离线归档包中同样缺席。

### 3.3 全局结构

```
<html data-theme="paper-warm">
  <body>
    <AmbientAudio />            // 悬浮音乐按钮，固定右下
    <SectionNav />              // 右侧竖排圆点，≥768px 才显示
    <main>
      <Hero /> … <Outro />      // 按 sections 顺序渲染
    </main>
    <PreviewBadge />            // 仅 preview=1 时出现
  </body>
</html>
```

---

## 4. 视觉设计系统

### 4.1 三条设计原则

1. **像一本册子，不像一个网站。** 没有导航栏、没有按钮组、没有卡片阴影堆叠。靠留白、字号与图片比例建立节奏。
2. **一屏一件事。** 每个章节只讲一件事，进入视口才播放动效，滚动即叙事。
3. **照片是主角。** 所有装饰元素透明度 ≤ 15%，任何情况下不遮挡人脸。

### 4.2 画布与栅格

- 移动优先，设计基准 **375×812**，内容最大宽度 **720px**（平板/桌面居中，两侧留白背景色）
- 安全边距：移动 `24px`，桌面 `48px`
- 纵向节奏：章节间 `96px`（移动）/ `160px`（桌面）
- 字号阶梯（px）：`12 / 14 / 16 / 18 / 22 / 28 / 36 / 48`

### 4.3 色彩 Tokens

基础色板（三套主题共用语义名，值不同）：

| Token | 语义 | 暖纸 paper-warm | 胶片 film | 极简 minimal |
|---|---|---|---|---|
| `--c-bg` | 页面底色 | `#FBF7F0` | `#0E0D0C` | `#FFFFFF` |
| `--c-surface` | 卡片/浮层 | `#FFFFFF` | `#1A1917` | `#FAFAFA` |
| `--c-ink` | 主文字 | `#2B2622` | `#F2EDE6` | `#111111` |
| `--c-ink-2` | 次级文字 | `#6B625A` | `#A79E93` | `#666666` |
| `--c-ink-3` | 辅助/标签 | `#9C9289` | `#6E665D` | `#999999` |
| `--c-line` | 分割线 | `#E7DED2` | `#2E2B27` | `#EEEEEE` |
| `--c-accent` | 强调色 | `#A6503C` | `#D98E5F` | `#111111` |
| `--c-accent-soft` | 强调底色 | `#F6E9E2` | `#2A211B` | `#F2F2F2` |
| `--c-gold` | 点缀金 | `#C0A062` | `#C0A062` | `#BBBBBB` |
| `--c-overlay` | 遮罩 | `rgba(43,38,34,.55)` | `rgba(0,0,0,.65)` | `rgba(0,0,0,.45)` |

对比度要求：正文 `--c-ink` on `--c-bg` ≥ 7:1；次级文字 ≥ 4.5:1。**任何主题下都必须满足**，改色时用 contrast checker 验证。

### 4.4 字体

不下载 Web 字体（中文包太大，拖慢首屏），全部使用系统字体栈：

```css
--font-display: "Songti SC", "STSong", "SimSun", "Noto Serif SC", serif;   /* 标题、信件正文 */
--font-body: -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
--font-num: "Optima", "Didot", "Times New Roman", serif;                   /* 天数、身高数字 */
```

| 用途 | 字体 | 字号 | 行高 | 字重 | 字距 |
|---|---|---|---|---|---|
| 封面姓名 | display | 44/48 | 1.15 | 500 | 0.04em |
| 章节标题 | display | 28/36 | 1.25 | 500 | 0.02em |
| 正文 | body | 16 | 1.75 | 400 | 0.01em |
| 信件正文 | display | 18 | 2.0 | 400 | 0.02em |
| 标签/说明 | body | 12 | 1.5 | 400 | 0.08em |
| 数字（天数/身高） | num | 36/48 | 1 | 400 | 0 |

### 4.5 间距、圆角、阴影

```css
--sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
--sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px; --sp-9: 96px;
--r-sm: 4px; --r-md: 8px; --r-lg: 16px; --r-full: 999px;
--shadow-soft: 0 2px 20px rgba(43,38,34,.06);
--shadow-lift: 0 8px 40px rgba(43,38,34,.10);
```

**禁止**：多层阴影、深色投影、描边按钮、渐变按钮。

### 4.6 主题实现

- 主题值写在 `app/themes.css`，三组 `[data-theme="..."]` 选择器，只覆盖 CSS 变量
- 组件只使用变量，不出现裸色值（`#fff` 也不行，用 `var(--c-surface)`）
- 主题切换不做运行时 UI（客户在后台选，构建时写死到 `<html data-theme>`）
- 深色主题（film）需额外覆盖图片边框与骨架屏颜色

```css
[data-theme="paper-warm"] { --c-bg:#FBF7F0; --c-surface:#FFF; /* … */ }
[data-theme="film"]       { --c-bg:#0E0D0C; --c-surface:#1A1917; /* … */ }
[data-theme="minimal"]    { --c-bg:#FFF;    --c-surface:#FAFAFA; /* … */ }
```

### 4.7 图形语言

- 分割线：1px `--c-line`，长度 40px，居中
- 章节序号：`01 / 09` 形式，`--c-ink-3`，12px，字距 0.2em
- 装饰：只用三种——圆点、细线、手绘箭头（内联 SVG，`currentColor`）
- **不用**：emoji 当图标（抓周物件除外）、玻璃拟态、大面积渐变、粒子动画

### 4.8 动效 Tokens

```css
--ease-out: cubic-bezier(.22,1,.36,1);     /* 入场 */
--ease-soft: cubic-bezier(.4,0,.2,1);      /* 位移 */
--dur-fast: 220ms;   /* 按钮、悬浮 */
--dur-base: 420ms;   /* 卡片入场 */
--dur-slow: 800ms;   /* 大图揭示、章节标题 */
```

规则：
- 进入视口触发一次，不重复播放
- `prefers-reduced-motion: reduce` 时全部降级为 `opacity` 渐变，位移 0
- 同屏同时动画元素 ≤ 6 个，超出用 stagger 30ms 错开
- 禁止视差滚动、禁止自动播放视频

---


## 5. 全局交互规范

### 5.1 滚动与章节导航

- 整页原生滚动，**不做** `scroll-snap`（iOS 微信里容易卡）
- 章节导航：右侧竖排 9 个 6px 圆点，间距 16px，当前章节圆点变 `--c-accent` 并拉长为 16px 竖条
- 断点：`≥768px` 显示，移动端隐藏（靠自然滚动）
- 点击圆点：`element.scrollIntoView({ behavior: "smooth", block: "start" })`
- 当前章节判定：`IntersectionObserver`，`rootMargin: "-45% 0px -45% 0px"`，取第一个命中项
- 顶部出现细进度条（1px，`--c-accent`，宽度 = 滚动百分比），仅桌面端

### 5.2 背景音乐

| 状态 | 行为 |
|---|---|
| 初始 | 不自动播放（微信/iOS 禁止），右下角显示 44px 圆形按钮，图标为静音喇叭 + 呼吸光圈 |
| 点击 | 淡入播放（600ms 音量 0→0.6），图标变为跳动的三根竖条（CSS 动画） |
| 页面切后台 | `visibilitychange` 暂停，回前台不自动续播 |
| 音频加载失败 | 按钮置灰，点击无响应，不弹错误（不打扰访客） |
| 分享卡片打开 | 同初始状态 |

实现：Howler.js，`html5: true`（移动端必须），`loop: true`，`volume: 0.6`。音频文件 ≤ 2.5MB，128kbps mp3。

### 5.3 图片灯箱

- 触发：点任意照片
- 结构：全屏 `--c-overlay` 背景 + 居中图片（`object-fit: contain`）+ 底部「3 / 30」计数 + 右上关闭
- 手势：左右滑动切换（阈值 60px），下滑超过 120px 关闭，双指捏合不做（避免与系统冲突）
- 键盘：`←` `→` `Esc`
- 打开时 `body` 加 `overflow:hidden`，关闭时恢复；记录 `scrollY` 并还原
- 图片加载中显示骨架（`--c-surface` 抖动）

### 5.4 分享

- 微信内：`<meta name="description">` + 微信 JS-SDK 分享（v1 不做签名，仅靠默认卡片）
- 通用：右下角「分享」按钮（仅 `outro` 章节出现），唤起 `navigator.share`，不支持时复制链接
- 海报：Canvas 生成 1080×1920，长按保存（微信内需提示「长按图片保存」）

### 5.5 加载与降级

| 场景 | 方案 |
|---|---|
| 首屏图 | `fetchpriority="high"` + `preload`，LQIP 模糊占位 |
| 章节图 | 进入视口前 400px 开始加载，`loading="lazy"` |
| 字体 | 系统字体，无 FOUT |
| JS 未加载 | 内容仍在 HTML 里（SSR），文字可读，图片 `src` 可显示 |
| 密码错误 | 输入框抖动 + 文案「密码不对，问问发链接给你的人」，不清空输入 |
| 内容字段缺失 | 该章节跳过，控制台 `warn`，不抛错白屏 |

### 5.6 埋点（极简）

只记录业务事件，不上报访客身份，不接第三方 SDK：

```
page_view        { slug, preview }
unlock_success   { slug }
section_view     { slug, kind, index }
audio_play       { slug }
poster_save      { slug }
share_click      { slug }
```

写入服务端 `logs/events-YYYY-MM-DD.jsonl`，一行一条。仅用于判断「客户到底有没有看完」。

---

## 6. 页面与组件详细规格

通用约定：

- 所有章节组件签名统一：`({ data, index, total }: SectionProps<T>)`
- 组件内不读路由、不读全局状态，只吃 `data`
- 动画用 `motion`（Framer Motion），进入视口用 `whileInView` + `viewport={{ once: true, amount: 0.25 }}`
- 每个章节最外层 `<section id={anchor} className="section">`，`scroll-margin-top: 0`

### 6.0 密码页 `/gate/[slug]`

**目的**：确认「你是被邀请的人」，同时不泄露任何内容。

**结构**（垂直居中，最大宽 320px）：

```
[ 宝宝名字 ]            24px display，--c-ink
[ 一句提示语 ]          14px，--c-ink-2，如「输入宝宝生日（4 位）」
[ ____ ]               下划线输入框，居中，4 位数字，letter-spacing 12px
[ 提示文案 ]            12px，--c-ink-3，「问问发链接给你的人」
```

**交互**

- 输入满 4 位自动提交（也支持回车）
- 提交中按钮禁用，输入框 `opacity: .6`
- 错误：整块 `translateX` 抖动 3 次（±6px，220ms），提示文案变 `--c-accent`，2 秒后恢复
- 成功：`router.replace` 到 `/s/[slug]`，页面淡入 300ms
- 连续错误 5 次：锁定 60 秒，提示「稍后再试」

**边界**

- 过期订单：直接渲染「这份纪念页已归档」+ 一个联系邮箱
- 未设置密码：直接放行（`access.mode === "public"`）
- 不允许在密码页渲染任何照片、姓名以外的信息

**服务端**

`POST /api/unlock` body `{ slug, password }` → 校验通过后种 Cookie `m_pass_{slug}`（HMAC-SHA256，`exp = now + 7d`，`httpOnly`、`sameSite=lax`、`secure`）→ 返回 `{ ok: true }`。

---

### 6.1 封面 `hero`

**目的**：3 秒内让人知道这是谁、几岁、值不值得往下滑。

**结构**

```
<div class="hero">                        100dvh，背景 = 封面图
  <div class="hero__veil" />              径向暗角遮罩
  <div class="hero__inner">               flex column，justify-end，padding-bottom 96px
    <p class="hero__eyebrow">             12px，字距 .3em，「2026 · 一周岁」
    <h1 class="hero__name">               44px display，宝宝小名
    <p class="hero__tagline">             16px，一句寄语（最多 24 字）
    <div class="hero__meta">              「2025.04.17 · 365 天」
    <button class="hero__scroll">         向下箭头，循环 2s 上下 8px
  </div>
</div>
```

**视觉**

- 封面图为 `object-fit: cover`，`object-position: center 30%`（保脸）
- 遮罩：`linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.55) 100%)`
- 文字全为浅色（`#FFF` 或 `--c-bg`），加 `text-shadow: 0 1px 12px rgba(0,0,0,.35)`

**动效**

- 进入：图 `scale(1.06) → 1`，1200ms；文字依次上移 16px + 淡入，stagger 120ms
- 滚动：图 `translateY(scrollY * 0.2)`，文字 `opacity = 1 - scrollY/400`（仅桌面，移动端禁用视差）

**数据**

```ts
{ kind: "hero", cover: Photo, name: string, tagline: string, birthday: string, showAge: boolean }
```

`ageText` 由系统计算：`365 天` / `1 岁 3 个月`（`showAge=false` 时不显示）。

**边界**

- 无封面图：用 `--c-surface` + 姓名居中排版兜底
- 寄语超过 24 字：CSS `line-clamp: 2`，不报错

---

### 6.2 十二个月 `timeline12`

**目的**：整份产品的骨架。妈妈最想看的就是「每个月长什么样」。

**结构**（每个月一个 block，纵向排列，桌面端左右交替）

```
<section id="months">
  <SectionTitle index="01" title="十二个月" subtitle="每一个月，都不一样" />
  <ol class="timeline">
    <li class="timeline__item">                 12 个
      <div class="timeline__dot">12</div>        左侧月份徽标
      <figure class="timeline__photo">           4:5，圆角 8px
        <SmartImage />
      </figure>
      <div class="timeline__text">
        <p class="timeline__note">第一次抬头</p>
        <p class="timeline__date">2025.05</p>
      </div>
    </li>
  </ol>
</section>
```

**视觉**

- 中间一条 1px 竖线（`--c-line`），移动端靠左 24px，桌面居中
- 月份徽标：40px 圆，`--c-surface` 底 + 1px `--c-line` 边，内文 `01`…`12`，`--font-num`
- 照片统一 4:5 竖图；横图自动 `object-fit: cover` 居中裁切
- 文案左对齐，与照片间距 16px

**动效**

- 每个 item 进入视口：`opacity 0→1`、`y 24→0`，`--dur-base`
- 竖线随滚动「生长」：用 `scaleY` 从 0 到 1，`origin-top`，绑定 `useScroll` 进度

**数据**

```ts
{
  kind: "timeline12",
  items: Array<{
    month: number;        // 1-12
    photo: Photo;
    note: string;         // ≤ 18 字
    date?: string;        // "2025.05"
    tags?: string[];      // ["第一次翻身"]
  }>
}
```

**边界**

- 少于 12 个月：缺的月份渲染「占位卡」（虚线框 + 「这个月的照片还在路上」），不允许留空
- 多于 12 个：只取前 12，构建时 `warn`
- 排序：强制按 `month` 升序，不管 JSON 顺序

---

### 6.3 成长曲线 `growth`

**目的**：把「长大了」这件事变成一条看得见的线。

**结构**

```
<section id="growth">
  <SectionTitle index="02" title="长大这件事" />
  <div class="growth__chart">          <GrowthChart points />
  <div class="growth__stats">           三列数字
    <Stat label="身高" value="76" unit="cm" />
    <Stat label="体重" value="9.8" unit="kg" />
    <Stat label="乳牙" value="8" unit="颗" />
  </div>
  <ul class="growth__firsts">           「第一次」清单
    <li><span>第一次翻身</span><time>4 个月 12 天</time></li>
  </ul>
</section>
```

**图表规格**（手写 SVG，不引图表库）

- 画布 `viewBox="0 0 320 180"`，`preserveAspectRatio="none"` 的外层 `aspect-ratio: 16/9`
- X 轴：0–12 月，等距 6 个刻度（0/2/4/6/8/10/12）
- Y 轴：身高或体重二选一，**默认身高**，右上角一个 pill 切换（身高 / 体重）
- 折线：`stroke: var(--c-accent)`，`stroke-width: 2`，`stroke-linecap: round`
- 面积：折线下方 `fill: var(--c-accent)`，`opacity: .08`
- 数据点：3px 圆，`fill: var(--c-bg)`，`stroke: var(--c-accent)`
- 动画：`stroke-dasharray` 从全长到 0，`duration: 1200ms`，进入视口触发一次
- 网格：只画 3 条横向虚线，`stroke: var(--c-line)`，`dasharray: 2 4`

**交互**

- 点击数据点：浮出 tooltip（月份 + 数值），3 秒后自动消失
- 切换身高/体重：`AnimatePresence` 交叉淡入，220ms

**数据**

```ts
{
  kind: "growth",
  points: Array<{ month: number; height: number; weight: number }>,  // 至少 3 个点
  teeth?: number,
  firsts?: Array<{ label: string; at: string }>   // at: "4 个月 12 天"
}
```

**边界**

- 点数 < 3：不画折线，改为三张数字卡（当前身高/体重/乳牙）
- 数值缺失（`null`）：该点跳过，折线断开用 `stroke-dasharray` 表示

---

### 6.4 抓周 `zhuazhou`

**目的**：全页唯一的互动，也是分享率的来源。

**结构**

```
<section id="zhuazhou">
  <SectionTitle index="03" title="抓周" subtitle="点一个，看看他抓到了什么" />
  <div class="zz__grid">                 3×2 网格，间距 12px
    <button class="zz__item">            104×104，圆角 16px，--c-surface
      <span class="zz__emoji">🖌️</span>   40px
      <span class="zz__label">画笔</span> 12px
    </button>
  </div>
  <p class="zz__hint">凭直觉点，别想太久</p>
</section>
```

**交互流程**

1. 6 个物件可点，hover/tap 时 `scale(1.04)` + 边框变 `--c-accent`
2. 点击 → 其余 5 个淡出（`opacity .25`），被选中的放大居中（`layoutId` 共享元素）
3. 320ms 后展开结果卡：物件大图 + 一句释义（40 字内）+ 「再抓一次」
4. 结果卡底部「保存这张」→ 生成 1080×1350 结果海报
5. 点「再抓一次」恢复 6 宫格，不记录历史

**数据**

```ts
{
  kind: "zhuazhou",
  items: Array<{
    key: string;          // "brush"
    emoji: string;        // "🖌️"
    label: string;        // "画笔"
    meaning: string;      // "以后大概会很喜欢涂涂画画"
    fortune: string;      // 结果卡标题，如 "抓到了画笔"
  }>
}
```

默认 6 项（`lib/copy.ts` 的 `ZHUAZHOU_DEFAULT`）：画笔 🖌️ / 书 📖 / 算盘 🧮 / 钱袋 💰 / 印章 🎖️ / 听诊器 🩺。

**边界**

- `items` 少于 3 个：整章不渲染
- 移动端长按会触发系统菜单：给按钮加 `-webkit-touch-callout: none; user-select: none`
- 结果卡不可跳过，必须点「再抓一次」或继续下滑

---

### 6.5 照片墙 `gallery`

**目的**：把剩下的好照片一次放完，但不至于变成瀑布流。

**结构**

```
<section id="gallery">
  <SectionTitle index="04" title="还有一些瞬间" />
  <div class="gallery">                   CSS columns，移动端 2 列，桌面 3 列
    <button class="gallery__item">        原生 button，可键盘聚焦
      <SmartImage ratio={p.ratio} />
    </button>
  </div>
  <p class="gallery__end">— 一共 N 张，都在这儿了 —</p>
</section>
```

**视觉**

- `column-count: 2; column-gap: 8px;` 移动端；`≥768px` 改 3 列
- 每张图 `break-inside: avoid; margin-bottom: 8px; border-radius: 4px;`
- 图片宽度 100%，高度按原始比例（`ratio` 字段仅用于占位，实际用 `aspect-ratio`）

**动效**

- 逐张淡入，`stagger 40ms`，最多错开 12 张（超出部分统一 600ms 后出现）

**交互**

- 点击 → 灯箱（见 5.3），索引与列表一致
- 键盘：Tab 聚焦有 `outline: 2px solid var(--c-accent)`，Enter 打开

**数据**

```ts
{ kind: "gallery", photos: Photo[], groups?: Array<{ title: string; photos: Photo[] }> }
```

**边界**

- 超过 60 张：只取前 60，构建时 `warn`
- 无照片：整章跳过
- 竖图与横图混排时，`columns` 自然错落，不做强制对齐

---

### 6.6 爸爸妈妈的信 `letter`

**目的**：全页情绪最高点。也是客户最容易被自己感动、最愿意转发的一屏。

**结构**

```
<section id="letter">
  <SectionTitle index="05" title="写给你的第一封信" />
  <div class="letter__paper">            信纸容器，最大宽 560px
    <p class="letter__to">致 小满</p>
    <div class="letter__body">            display 字体，18px/2.0
      <Typewriter text={body} />
    </div>
    <p class="letter__sign">妈妈<br/>2026.04.17</p>
  </div>
</section>
```

**视觉**

- 信纸：`--c-surface` 底 + `box-shadow: var(--shadow-soft)` + 圆角 8px + 上下 48px 内边距
- 可选纹理：暖纸主题叠加一层 `radial-gradient` 噪点（`opacity: .03`）
- 正文首行缩进 2em；段落之间 1em
- 落款右对齐，`--font-display`

**动效（打字机）**

- 进入视口后开始，**只播放一次**
- 逐字显示，速度 45ms/字；遇到 `，。！？` 额外停顿 180ms
- 光标：1px 竖线，闪烁 600ms
- 支持「跳过」：点击信纸区域立即全量显示（避免长信等太久）
- `prefers-reduced-motion`：直接全量显示

**数据**

```ts
{
  kind: "letter",
  from: string,            // "妈妈" | "爸爸妈妈"
  to?: string,             // "小满"
  title?: string,
  body: string,            // 支持 \n 分段，≤ 800 字
  signature?: string,      // "2026.04.17"
  handwriting?: Photo      // 手写扫描件，可选
}
```

**边界**

- `body` 超过 800 字：后台校验报错（不截断，让运营改）
- 手写扫描件存在时：打字机不播放，直接展示扫描图（避免重复表达）
- 断网：已渲染文本保留

---

### 6.7 给未来的一封信 `futureLetter`

**目的**：整份产品的记忆点。一次收费，把交付物延长到 18 年。

**结构**

**未解锁（今天 < unlockAt）**

```
<section id="future">
  <div class="fl__card">                 居中卡片，最大宽 420px
    <div class="fl__seal">🔒</div>        封印图形（内联 SVG）
    <p class="fl__label">给十八岁的小满</p>
    <p class="fl__count"><b>6205</b> 天后开启</p>
    <p class="fl__hint">这封信现在打不开，等他自己来读</p>
  </div>
</section>
```

**已解锁（今天 ≥ unlockAt）**

```
<section id="future">
  <div class="fl__card fl__card--open">
    <p class="fl__label">给十八岁的小满</p>
    <div class="fl__body">……信件正文，逐段淡入……</div>
    <p class="fl__sign">妈妈 · 2026.04.17 写</p>
  </div>
</section>
```

**视觉**

- 未解锁：卡片 `--c-accent-soft` 底，虚线边框（`1px dashed var(--c-accent)`，`opacity:.4`），锁图标 40px
- 倒计时数字用 `--font-num`，36px，`--c-accent`
- 已解锁：卡片变 `--c-surface`，实线边框，播放「拆封」动画（卡片轻微上浮 + 阴影加深，600ms）
- **禁止**把正文放进 DOM（未解锁时服务端就不下发正文，防止查看源码剧透）

**倒计时计算**

```ts
daysLeft = Math.max(0, Math.ceil((unlockAt - today) / 86400000))
```

按 `Asia/Shanghai` 计算当天 00:00 为边界；`unlockAt` 为日期字符串 `YYYY-MM-DD`。

**数据**

```ts
{
  kind: "futureLetter",
  title: string,        // "给十八岁的小满"
  unlockAt: string,     // "2043-04-17"
  body: string,         // 未解锁时不从服务端返回
  from: string,
  writtenAt: string     // "2026.04.17 写"
}
```

**边界**

- `unlockAt` 非法或早于生日：后台校验报错
- 未解锁且 `daysLeft > 3650`（10 年）：文案改为「等他长大」
- 时区：服务端统一用 `Asia/Shanghai`，禁止用浏览器本地时区

---

### 6.8 亲友祝福 `guestbook`

**目的**：让不能到场的亲友也「在场」。v1 只做展示，不做公开提交。

**结构**

```
<section id="bless">
  <SectionTitle index="07" title="他们想对你说" />
  <ul class="bless__list">
    <li class="bless__item">
      <p class="bless__text">愿你一生被爱，也懂得爱人。</p>
      <p class="bless__from">外婆</p>
    </li>
  </ul>
</section>
```

**视觉**

- 每条：`--c-surface` 底，圆角 8px，内边距 20px，无阴影
- 祝福语 16px `--font-display`，落款 12px `--c-ink-3`，右对齐
- 列表间距 12px；超过 6 条时，第 7 条起默认折叠，底部「展开全部（N）」

**动效**

- 逐条上移淡入，`stagger 60ms`

**数据**

```ts
{ kind: "guestbook", messages: Array<{ text: string; from: string; relation?: string }> }
```

**边界**

- 单条超过 60 字：后台截断提示
- 无祝福：整章跳过（不在页面上留空）

---

### 6.9 结尾 `outro`

**目的**：把情绪收住，并把分享动作做掉。

**结构**

```
<section id="end">
  <div class="outro__sign">— 谢谢你来看我 —</div>
  <p class="outro__thanks">小满 · 一周岁</p>
  <div class="outro__actions">
    <button>保存分享图</button>
    <button>分享给家人</button>
  </div>
  <div class="outro__qr">               二维码，仅桌面显示
    <img src="{slug}/qr.png" />
    <span>扫码也能看</span>
  </div>
  <footer class="outro__footer">         12px，--c-ink-3
    <span>仅限家人查看</span>
    <span>由「一周岁」制作</span>
    <span>2026</span>
  </footer>
</section>
```

**视觉补充**：页脚第一行「仅限家人查看」常驻（对应 S-11），不随主题变化，颜色 `--c-ink-3`，字号 11px。

**分享海报规格**（Canvas 2D，1080×1920）

```
y=0     封面图（cover，1080×1080，底部 160px 渐隐到纸色）
y=1080  姓名（display 72px，居中）
y=1170  「一周岁 · 2026.04.17」（28px，--c-ink-2）
y=1240  一句话（32px，两行截断）
y=1600  二维码（240×240，居中，白底圆角 12）
y=1860  「扫码看看他的一年」（24px，--c-ink-3）
```

- 生成后 `toBlob('image/png')`，移动端提示「长按图片保存」
- 桌面端 `a[download]` 直接下载
- 二维码由服务端在构建时生成，前端只负责贴图

**数据**

```ts
{ kind: "outro", thanks: string, signature: string, showQr: boolean }
```

---

## 7. 数据模型

### 7.1 目录约定

```
content/orders/{slug}/story.json          # 唯一内容源
content/orders/{slug}/raw/                # 客户原图（不发布，仅制作期）
public/orders/{slug}/                     # 处理后的成品资源（会发布）
  ├─ cover.jpg / cover.avif
  ├─ m01.jpg … m12.jpg                    # 十二个月
  ├─ p01.jpg … p30.jpg                    # 精选
  ├─ bgm.mp3
  └─ qr.png
```

- `slug` 规则：`bb-{YYYYMMDD}`（如 `bb-20250417`），小写、连字符、3–40 位
- 一单一个目录，删除/备份/迁移都以目录为单位
- `raw/` 永不进入 `public/`，避免原图泄露（EXIF 含定位）

### 7.2 TypeScript 类型

```ts
// lib/types.ts
export type ThemeKey = "paper-warm" | "film" | "minimal";
export type Ratio = "1:1" | "4:5" | "3:4" | "16:9";

export interface Photo {
  src: string;          // 相对 public/orders/{slug}/ 的文件名
  alt: string;
  ratio: Ratio;
}

export interface BaseSection {
  id: string;
  kind: SectionKind;
  enabled: boolean;
}

export type SectionKind =
  | "hero" | "timeline12" | "growth" | "zhuazhou"
  | "gallery" | "letter" | "futureLetter" | "guestbook" | "outro";

export interface HeroSection extends BaseSection {
  kind: "hero";
  name: string;
  tagline: string;
  birthday: string;     // YYYY-MM-DD
  cover: Photo;
  showAge: boolean;
}

export interface Timeline12Section extends BaseSection {
  kind: "timeline12";
  items: Array<{ month: number; photo: Photo; note: string; date?: string; tags?: string[] }>;
}

export interface GrowthSection extends BaseSection {
  kind: "growth";
  points: Array<{ month: number; height: number; weight: number }>;
  teeth?: number;
  firsts?: Array<{ label: string; at: string }>;
}

export interface ZhuazhouSection extends BaseSection {
  kind: "zhuazhou";
  items: Array<{ key: string; emoji: string; label: string; meaning: string; fortune: string }>;
}

export interface GallerySection extends BaseSection {
  kind: "gallery";
  photos: Photo[];
  groups?: Array<{ title: string; photos: Photo[] }>;
}

export interface LetterSection extends BaseSection {
  kind: "letter";
  from: string;
  to?: string;
  title?: string;
  body: string;
  signature?: string;
  handwriting?: Photo;
}

export interface FutureLetterSection extends BaseSection {
  kind: "futureLetter";
  title: string;
  unlockAt: string;     // YYYY-MM-DD
  body: string;         // 锁定态不下发
  from: string;
  writtenAt: string;
}

export interface GuestbookSection extends BaseSection {
  kind: "guestbook";
  messages: Array<{ text: string; from: string; relation?: string }>;
}

export interface OutroSection extends BaseSection {
  kind: "outro";
  thanks: string;
  signature: string;
  showQr: boolean;
}

export type Section =
  | HeroSection | Timeline12Section | GrowthSection | ZhuazhouSection
  | GallerySection | LetterSection | FutureLetterSection | GuestbookSection | OutroSection;

export interface Story {
  slug: string;
  kind: "baby_first_birthday";
  theme: ThemeKey;
  meta: { title: string; description: string; ogImage?: string };
  access: { mode: "password" | "public"; password?: string; expiresAt?: string; noindex: boolean };
  sections: Section[];
}
```

### 7.3 Zod Schema（`lib/schema.ts`，必须与 7.2 完全对应）

```ts
import { z } from "zod";

export const ThemeKey = z.enum(["paper-warm", "film", "minimal"]);
const Ratio = z.enum(["1:1", "4:5", "3:4", "16:9"]);
const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期必须是 YYYY-MM-DD");

const photo = z.object({
  src: z.string().regex(/^[\w.-]+\.(avif|webp|jpe?g|png)$/i, "只允许文件名，不允许路径"),
  alt: z.string().max(60).default(""),
  ratio: Ratio.default("4:5"),
});

const base = z.object({
  id: z.string().min(1),
  enabled: z.boolean().default(true),
});

export const hero = base.extend({
  kind: z.literal("hero"),
  name: z.string().min(1).max(8),
  tagline: z.string().max(24),
  birthday: DateStr,
  cover: photo,
  showAge: z.boolean().default(true),
});

export const timeline12 = base.extend({
  kind: z.literal("timeline12"),
  items: z.array(z.object({
    month: z.number().int().min(1).max(12),
    photo,
    note: z.string().min(1).max(18),
    date: z.string().max(10).optional(),
    tags: z.array(z.string().max(8)).max(3).optional(),
  })).min(1).max(12),
});

export const growth = base.extend({
  kind: z.literal("growth"),
  points: z.array(z.object({
    month: z.number().int().min(0).max(12),
    height: z.number().positive().max(120),
    weight: z.number().positive().max(30),
  })).max(13),
  teeth: z.number().int().min(0).max(32).optional(),
  firsts: z.array(z.object({ label: z.string().max(12), at: z.string().max(12) })).max(8).optional(),
});

export const zhuazhou = base.extend({
  kind: z.literal("zhuazhou"),
  items: z.array(z.object({
    key: z.string().min(1).max(20),
    emoji: z.string().min(1).max(4),
    label: z.string().min(1).max(6),
    meaning: z.string().min(1).max(40),
    fortune: z.string().min(1).max(12),
  })).min(3).max(9),
});

export const gallery = base.extend({
  kind: z.literal("gallery"),
  photos: z.array(photo).max(60),
  groups: z.array(z.object({ title: z.string().max(12), photos: z.array(photo) })).optional(),
});

export const letter = base.extend({
  kind: z.literal("letter"),
  from: z.string().min(1).max(10),
  to: z.string().max(10).optional(),
  title: z.string().max(20).optional(),
  body: z.string().min(10).max(800),
  signature: z.string().max(20).optional(),
  handwriting: photo.optional(),
});

export const futureLetter = base.extend({
  kind: z.literal("futureLetter"),
  title: z.string().min(1).max(20),
  unlockAt: DateStr,
  body: z.string().min(10).max(1200),
  from: z.string().min(1).max(10),
  writtenAt: z.string().max(20),
});

export const guestbook = base.extend({
  kind: z.literal("guestbook"),
  messages: z.array(z.object({
    text: z.string().min(1).max(60),
    from: z.string().min(1).max(10),
    relation: z.string().max(6).optional(),
  })).max(40),
});

export const outro = base.extend({
  kind: z.literal("outro"),
  thanks: z.string().min(1).max(30),
  signature: z.string().min(1).max(30),
  showQr: z.boolean().default(true),
});

export const section = z.discriminatedUnion("kind", [
  hero, timeline12, growth, zhuazhou, gallery, letter, futureLetter, guestbook, outro,
]);

export const storySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/),
  kind: z.literal("baby_first_birthday"),
  theme: ThemeKey,
  meta: z.object({
    title: z.string().max(30),
    description: z.string().max(80),
    ogImage: z.string().optional(),
  }),
  access: z.object({
    mode: z.enum(["password", "public"]).default("password"),
    password: z.string().regex(/^\d{4}$/).optional(),
    expiresAt: DateStr.optional(),
    noindex: z.boolean().default(true),
  }),
  sections: z.array(section).min(1).max(9),
});
```

**加载与校验**（`lib/story.ts`）

```ts
export async function loadStory(slug: string): Promise<Story | null> {
  const file = path.join(CONTENT_DIR, slug, "story.json");
  if (!fs.existsSync(file)) return null;
  const raw = JSON.parse(await fs.readFile(file, "utf8"));
  const parsed = storySchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new StoryError(`story.json 校验失败\n${detail}`);
  }
  return normalize(parsed.data);   // 补默认值、排序、去重
}
```

`normalize()` 负责：
- `sections` 按固定顺序重排（hero → … → outro）
- `timeline12.items` 按 `month` 升序，缺月补占位
- `gallery.photos` 去重、超过 60 张截断
- 未解锁的 `futureLetter.body` 置空（`""`），并加 `locked: true`

### 7.4 示例 `story.json`（可直接复制给新订单）

> 下面是**节选**：`timeline12` 只列 2 个月、`zhuazhou` 只列 3 个物件，实际新单应补满 12 条与 6 个（其余走 `lib/copy.ts` 的默认值）。

```json
{
  "slug": "bb-20250417",
  "kind": "baby_first_birthday",
  "theme": "paper-warm",
  "meta": {
    "title": "小满的一周岁",
    "description": "2025.04.17 — 2026.04.17，谢谢你选中我们做你的爸爸妈妈。"
  },
  "access": { "mode": "password", "password": "0417", "expiresAt": "2028-04-17", "noindex": true },
  "sections": [
    {
      "id": "hero", "kind": "hero", "enabled": true,
      "name": "小满",
      "tagline": "谢谢你选中我们做你的爸爸妈妈",
      "birthday": "2025-04-17",
      "cover": { "src": "cover.jpg", "alt": "满月那天", "ratio": "4:5" },
      "showAge": true
    },
    {
      "id": "months", "kind": "timeline12", "enabled": true,
      "items": [
        { "month": 1, "photo": { "src": "m01.jpg", "alt": "第一个月" }, "note": "第一次抬头", "date": "2025.05" },
        { "month": 2, "photo": { "src": "m02.jpg", "alt": "第二个月" }, "note": "会笑了", "date": "2025.06" }
      ]
    },
    {
      "id": "growth", "kind": "growth", "enabled": true,
      "points": [
        { "month": 0, "height": 50.2, "weight": 3.4 },
        { "month": 6, "height": 68.5, "weight": 8.1 },
        { "month": 12, "height": 76.0, "weight": 9.8 }
      ],
      "teeth": 8,
      "firsts": [
        { "label": "第一次翻身", "at": "4 个月 12 天" },
        { "label": "第一次叫妈妈", "at": "9 个月 3 天" }
      ]
    },
    {
      "id": "zhuazhou", "kind": "zhuazhou", "enabled": true,
      "items": [
        { "key": "brush", "emoji": "🖌️", "label": "画笔", "meaning": "以后大概会很喜欢涂涂画画。", "fortune": "抓到了画笔" },
        { "key": "book", "emoji": "📖", "label": "书", "meaning": "是个爱读书的小朋友。", "fortune": "抓到了书" },
        { "key": "abacus", "emoji": "🧮", "label": "算盘", "meaning": "对数字敏感，将来会算账。", "fortune": "抓到了算盘" }
      ]
    },
    {
      "id": "gallery", "kind": "gallery", "enabled": true,
      "photos": [
        { "src": "p01.jpg", "alt": "全家福", "ratio": "4:5" },
        { "src": "p02.jpg", "alt": "第一次游泳", "ratio": "1:1" }
      ]
    },
    {
      "id": "letter", "kind": "letter", "enabled": true,
      "from": "妈妈", "to": "小满", "title": "写给你的第一封信",
      "body": "你来的那天下了很大的雨。\n护士把你放在我胸口的时候，你睁着眼睛看我，好像早就在等我。\n这一年，你学会了翻身、坐着、扶着站起来，也学会了在人群里一眼找到我。\n谢谢你选中我们。",
      "signature": "妈妈 · 2026.04.17"
    },
    {
      "id": "future", "kind": "futureLetter", "enabled": true,
      "title": "给十八岁的小满",
      "unlockAt": "2043-04-17",
      "body": "如果你读到这里，说明你已经十八岁了……",
      "from": "妈妈",
      "writtenAt": "2026.04.17 写"
    },
    {
      "id": "bless", "kind": "guestbook", "enabled": true,
      "messages": [
        { "text": "愿你一生被爱，也懂得爱人。", "from": "外婆" },
        { "text": "长大要记得回来看奶奶。", "from": "奶奶", "relation": "奶奶" }
      ]
    },
    {
      "id": "end", "kind": "outro", "enabled": true,
      "thanks": "谢谢你来看我",
      "signature": "小满 · 一周岁",
      "showQr": true
    }
  ]
}
```

### 7.5 校验规则总表

| 规则 | 级别 | 处理 |
|---|---|---|
| `slug` 不合规 | error | 建单时拒绝 |
| `timeline12.items` 少于 8 个月 | warn | 后台黄条提示，允许发布 |
| `timeline12.items` 超过 12 | error | 截断并提示 |
| `letter.body` > 800 字 | error | 拒绝保存 |
| `futureLetter.unlockAt` ≤ 生日 | error | 拒绝保存 |
| 封面图缺失 | error | 拒绝生成预览 |
| 章节 `enabled=false` 超过一半 | warn | 提示「页面会显得很空」 |
| 引用的图片文件不存在 | error | 生成预览前全量检查，列出缺失文件名 |

---

## 8. 技术架构

### 8.1 技术栈（锁定版本，不升级）

```json
{
  "dependencies": {
    "next": "15.1.6",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "zod": "3.24.1",
    "framer-motion": "11.15.0",
    "howler": "2.2.4",
    "sharp": "0.33.5",
    "qrcode": "1.5.4",
    "date-fns": "4.1.0",
    "date-fns-tz": "3.2.0",
    "@prisma/client": "6.2.1",
    "clsx": "2.1.1"
  },
  "devDependencies": {
    "typescript": "5.7.3",
    "tailwindcss": "3.4.17",
    "postcss": "8.5.1",
    "autoprefixer": "10.4.20",
    "prisma": "6.2.1",
    "@playwright/test": "1.49.1",
    "vitest": "2.1.8",
    "@types/node": "22.10.5",
    "@types/react": "19.0.7",
    "@types/howler": "2.2.12",
    "@types/qrcode": "1.5.5",
    "eslint": "9.18.0",
    "prettier": "3.4.2"
  }
}
```

选型理由（写进 README，避免后来被"优化"）：

| 选择 | 理由 | 备选为何不用 |
|---|---|---|
| Next.js App Router | SSR 保证「未来信」不泄露正文，路由/构建一体化 | Astro 缺 SSR 数据脱敏的便利 |
| Tailwind 3.4 | 配置式 token，主题靠 CSS 变量覆盖 | Tailwind 4 无 config，Agent 易跑偏 |
| Framer Motion | `layoutId` 做抓周共享元素，成本最低 | CSS 动画做不了布局动画 |
| Howler | 移动端 `html5: true` 是刚需 | 原生 `<audio>` 在 X5 上状态不可靠 |
| Prisma + SQLite | 单机、零运维、备份=拷文件 | 直接上 Postgres 是过度设计 |
| Playwright | 端到端测试 E1–E10，保证「密码门 / 未来信 / 抓周」不被改坏 | Cypress 更重；v1 不导出 PDF，无需浏览器打印能力 |

### 8.2 目录结构

```
yizhouji/
├─ app/
│  ├─ layout.tsx                 # <html data-theme> + 全局样式
│  ├─ page.tsx                   # 落地页
│  ├─ globals.css                # reset + tailwind + 基础排版
│  ├─ themes.css                 # 三套主题变量
│  ├─ gate/[slug]/page.tsx
│  ├─ s/[slug]/page.tsx
│  ├─ s/[slug]/expired/page.tsx
│  ├─ admin/
│  │  ├─ layout.tsx
│  │  ├─ login/page.tsx
│  │  ├─ orders/page.tsx
│  │  ├─ orders/new/page.tsx
│  │  └─ orders/[slug]/page.tsx
│  └─ api/
│     ├─ unlock/route.ts
│     ├─ health/route.ts
│     └─ admin/
│        ├─ login/route.ts
│        ├─ orders/route.ts
│        ├─ orders/[slug]/route.ts
│        ├─ orders/[slug]/assets/route.ts
│        └─ orders/[slug]/build/route.ts
├─ components/
│  ├─ sections/                  # Hero.tsx / Timeline12.tsx / Growth.tsx / …
│  ├─ ui/
│  │  ├─ SmartImage.tsx
│  │  ├─ SectionTitle.tsx
│  │  ├─ Lightbox.tsx
│  │  ├─ AmbientAudio.tsx
│  │  ├─ SectionNav.tsx
│  │  ├─ Typewriter.tsx
│  │  ├─ Stat.tsx
│  │  └─ PosterButton.tsx
│  ├─ StoryView.tsx              # 按 sections 渲染的分发器
│  └─ PreviewBadge.tsx
├─ lib/
│  ├─ types.ts  schema.ts  story.ts  auth.ts  date.ts
│  ├─ copy.ts  db.ts  poster.ts  theme.ts  guard.ts
├─ content/orders/{slug}/…
├─ public/orders/{slug}/…
├─ scripts/
│  ├─ assets.ts                  # 图片管线 CLI
│  ├─ qr.ts                     # 二维码生成
│  └─ archive.ts                 # 到期归档
├─ prisma/schema.prisma
├─ middleware.ts
├─ tailwind.config.ts
├─ next.config.mjs
├─ DEV_SPEC.md
└─ package.json
```

### 8.3 渲染与缓存策略

```ts
// app/s/[slug]/page.tsx
export const dynamic = "force-dynamic";   // 每次请求 SSR
export const revalidate = 0;
```

**为什么不用静态生成**（写进代码注释，避免被"优化"）：

1. 「未来信」的正文**不能**在锁定状态下进入 HTML，必须在请求时判断日期
2. 订单是持续新增的，静态化要为新单重新构建
3. 密码门是中间件级的，静态页面同样需要中间件，没有额外收益
4. 单页 HTML 约 20–40KB，2C2G 机器 SSR 耗时 < 8ms，不是瓶颈

响应头（`next.config.mjs` 中对 `/s/:path*` 设置）：

```
Cache-Control: private, no-store, max-age=0
X-Robots-Tag: noindex, nofollow
Referrer-Policy: no-referrer
```

页面 `metadata` 由 `story.meta` 生成（`generateMetadata`）：`title` = 「小满的一周岁」，`description` = 一句寄语，`og:image` = `cover.jpg`（1200×630 裁切版）。微信分享卡片取 `<title>` 与首图，因此 `title` 必须包含「一周岁」，否则客户转发到家族群时看不出是什么。

### 8.4 主题实现

`app/layout.tsx` 从订单读取 `theme`，写到 `<html data-theme="...">`；全局只能有一个来源，禁止在组件里 `class="dark"` 之类的切换。

```tsx
export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="paper-warm" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
```

`app/themes.css`（节选，完整值见 4.3）：

```css
:root {
  --font-display: "Songti SC", "STSong", "SimSun", "Noto Serif SC", serif;
  --font-body: -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --ease-out: cubic-bezier(.22,1,.36,1);
  --dur-base: 420ms;
}
[data-theme="paper-warm"] { --c-bg:#FBF7F0; --c-surface:#FFFFFF; --c-ink:#2B2622; /* … */ }
[data-theme="film"]       { --c-bg:#0E0D0C; --c-surface:#1A1917; --c-ink:#F2EDE6; /* … */ }
[data-theme="minimal"]    { --c-bg:#FFFFFF; --c-surface:#FAFAFA; --c-ink:#111111; /* … */ }
```

`tailwind.config.ts` 把变量映射成语义类，**组件里只写语义类**：

```ts
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--c-bg)", surface: "var(--c-surface)",
        ink: "var(--c-ink)", "ink-2": "var(--c-ink-2)", "ink-3": "var(--c-ink-3)",
        line: "var(--c-line)", accent: "var(--c-accent)", "accent-soft": "var(--c-accent-soft)",
        gold: "var(--c-gold)",
      },
      fontFamily: { display: "var(--font-display)", body: "var(--font-body)" },
      transitionTimingFunction: { out: "var(--ease-out)" },
    },
  },
} satisfies Config;
```

### 8.5 图片管线（`scripts/assets.ts` + `lib/images.ts`）

**输入**：`content/orders/{slug}/raw/*`（任意尺寸、任意 EXIF）
**输出**：`public/orders/{slug}/` 下的三档图 + LQIP

| 档位 | 长边 | 格式 | 质量 | 用途 |
|---|---|---|---|---|
| `lg` | 1600 | AVIF + WebP + JPG 兜底 | 52 | 灯箱、封面 |
| `md` | 900 | WebP | 60 | 正文与时间轴 |
| `sm` | 320 | WebP | 60 | 缩略图、LQIP 基底 |

处理规则：

```ts
await sharp(src)
  .rotate()                               // 按 EXIF 摆正
  .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
  .withMetadata({ exif: {} })             // 清空 EXIF（定位/设备）
  .avif({ quality: 52, effort: 6 })
  .toFile(out);
```

- 文件名统一小写、去空格：`iPhone 15 原图.JPG` → `p03.jpg`
- 生成 `manifest.json`：`{ "p03": { w, h, lqip } }`，供 `<SmartImage>` 读取宽高比与占位色
- `SmartImage` 输出 `<picture>`：AVIF → WebP → JPG，`srcSet` 三档，`sizes="(max-width:768px) 100vw, 720px"`
- 强制 `width`/`height` 或 `aspect-ratio`，**禁止 CLS**
- 任何 `<img>` 直接引用都算违规（见 0.5）

**图片总量预算**：12 张月照（md，约 90KB/张）+ 30 张精选（md 90KB + lg 220KB）+ 封面 260KB ≈ 3.3MB，需在构建时输出体积报告，超过 3.5MB `warn`。

### 8.6 音频

- 上传时转码：`ffmpeg -i in.mp3 -b:a 128k -ar 44100 -ac 2 out.mp3`（脚本调用，不引依赖）
- 时长 ≤ 3 分钟、体积 ≤ 2.5MB，超限报错
- 前端：`new Howl({ src, html5: true, loop: true, volume: 0.6 })`
- 首次播放必须由用户点击触发；`Howler.ctx.state === "suspended"` 时先 `resume()`

### 8.7 二维码与海报

**二维码**（构建时，`scripts/qr.ts`）

```ts
const url = `${SITE_URL}/s/${slug}`;
const buf = await QRCode.toBuffer(url, {
  type: "png", width: 480, margin: 1,
  color: { dark: "#2B2622", light: "#FFFFFF" },
  errorCorrectionLevel: "M",
});
await fs.writeFile(`public/orders/${slug}/qr.png`, buf);
```

**海报**（客户端 Canvas，`lib/poster.ts`）

- 输入：封面 `HTMLImageElement`、姓名、日期、寄语、二维码
- 画布 1080×1920，`ctx.scale(1,1)`（不做 DPR 缩放，输出就是 1:1）
- 文字用 `ctx.font = '500 72px "Songti SC", serif'`，居中 `textAlign: center`
- 超长文案两行截断，末尾加 `…`
- `canvas.toBlob(cb, "image/png", 0.92)`
- 失败降级：隐藏按钮，提示「截图保存也行」

### 8.8 访问控制

**Cookie 格式**：`m_pass_{slug} = base64(payload).hmac`

```
payload = { s: slug, exp: 1735689600000 }
sign    = HMAC_SHA256(payload, AUTH_SECRET)
```

**中间件**（`middleware.ts`）：

```ts
export const config = { matcher: ["/s/:path*", "/admin/:path*"] };

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 后台
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return;
    const ok = await verifyAdmin(req.cookies.get("m_admin")?.value);
    if (!ok) return NextResponse.redirect(new URL("/admin/login", req.url));
    return;
  }

  const slug = pathname.split("/")[2];
  const story = await peekAccess(slug);                 // 只读 access 字段，按 mtime 缓存 60s
  if (!story) return NextResponse.rewrite(new URL("/404", req.url));
  if (story.expired) return NextResponse.rewrite(new URL(`/s/${slug}/expired`, req.url));
  if (story.mode === "public") return;

  const ok = await verifyPass(req.cookies.get(`m_pass_${slug}`)?.value);
  if (!ok) return NextResponse.rewrite(new URL(`/gate/${slug}`, req.url));
}
```

**`peekAccess` 的性能约束**：中间件在每次请求前执行，禁止每次 `readFile`。实现为进程内缓存 `Map<slug, { mtime, access }>`，`stat` 后命中即返回；`stat` 本身很便宜（本地磁盘 < 0.1ms）。

**规则**

- 密码 4 位数字，`crypto.timingSafeEqual` 比较（先 hash 再比）
- 连续 5 次错误：`fail:{slug}:{ip}` 计数，60 秒锁定（存内存 Map 即可，单机）
- 同一 slug 全天失败累计 50 次：锁 24 小时并记日志（防分布式试探）
- `AUTH_SECRET` 从环境变量读，缺失时启动即失败（不允许有默认值）
- 后台密码单独一套（`ADMIN_PASSWORD`），Cookie 名不同，有效期 12h
- 预览态：`?preview=1` + 后台 Cookie 才生效；预览页右下角固定「预览版 · 未交付」水印，且禁用分享按钮

---


## 9. 后台与 API

### 9.1 后台页面

单用户、无权限模型、不做设计系统，能干活就行。四张页面：

**`/admin/orders` — 订单列表**

| 列 | 说明 |
|---|---|
| 宝宝 / slug | 主标题 + 副标题 |
| 状态 | 彩色 tag：`paid` 蓝 / `assets` 青 / `building` 黄 / `review` 橙 / `delivered` 绿 / `archived` 灰 |
| 生日 | `2025.04.17` |
| 交付倒计时 | 距生日天数，负数标红（说明已经迟了） |
| 操作 | 打开 / 复制链接 / 归档 |

顶部三个数字：本月订单数、待制作数、逾期数。

**`/admin/orders/new` — 建单**

字段：宝宝小名、生日、slug（自动生成 `bb-YYYYMMDD` 可改）、主题（三选一预览缩略图）、密码（默认生日月日）、档位（标准 / 尊享）、定金。

提交后：创建目录 → 写一份带默认值的 `story.json` → 复制 8 张占位图 → 跳详情页。**必须能立刻打开预览**（哪怕内容是占位），让运营看到进度。

**`/admin/orders/[slug]` — 订单详情（4 个 tab）**

- **基本**：客户信息、档位、金额、状态按钮、备注
- **素材**：拖拽上传（多选）、九宫格缩略图、缺失项检查（12 张月照 / 30 张精选 / 封面 / BGM），每项一个 ✓ 或 ✗
- **内容**：左表单 + 右 JSON 预览。表单只覆盖高频字段（姓名、寄语、12 个月 note、信件正文、未来信日期），其余走 JSON 文本框（带「格式化」「校验」两个按钮，校验结果直接展示 Zod 错误路径）
- **交付**：预览链接、正式链接、二维码下载、密码重置、归档（海报在页面里由客户自己长按保存，后台不生成）

状态按钮按 2.2 的迁移表渲染，不可用的置灰并给出原因（如「素材未齐，不能开始制作」）。

**`/admin/login`**

单密码输入，错误 3 次锁 5 分钟。不做注册、找回。

### 9.2 数据表（Prisma / SQLite）

```prisma
model Order {
  id           String   @id @default(cuid())
  slug         String   @unique
  status       String   @default("draft")
  babyName     String
  birthday     DateTime
  theme        String   @default("paper-warm")
  tier         String   @default("basic")    // basic | plus
  amount       Int      @default(399)        // 分
  depositPaid  Int      @default(0)
  finalPaid    Int      @default(0)
  contact      String?
  note         String?
  revisions    Int      @default(0)
  deliveredAt  DateTime?
  archivedAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Event {
  id        String   @id @default(cuid())
  slug      String
  type      String
  payload   String?
  createdAt DateTime @default(now())
  @@index([slug, type])
}
```

`story.json` 是内容源，数据库只存订单元数据与事件。**两边不重复存储内容**，避免不一致。

### 9.3 API 契约

统一响应：

```jsonc
// 成功
{ "ok": true, "data": {} }

// 失败
{ "ok": false, "error": { "code": "ASSET_MISSING", "message": "缺少 3 张月照", "detail": ["m04.jpg"] } }
```

| 方法 | 路径 | 入参 | 出参 | 说明 |
|---|---|---|---|---|
| POST | `/api/unlock` | `{ slug, password }` | `{ ok }` + Set-Cookie | 5 次/60s 限流 |
| POST | `/api/admin/login` | `{ password }` | `{ ok }` + Set-Cookie | 3 次/5min 限流 |
| GET | `/api/admin/orders` | `?status=` | `Order[]` | 列表 |
| POST | `/api/admin/orders` | `{ babyName, birthday, theme, tier, password }` | `Order` | 建单 + 建目录 |
| PATCH | `/api/admin/orders/[slug]` | `{ status?, amount?, note?, theme? }` | `Order` | 状态迁移校验 |
| POST | `/api/admin/orders/[slug]/assets` | `multipart: files[]` | `{ saved: string[] }` | 走图片管线 |
| POST | `/api/admin/orders/[slug]/build` | `{}` | `{ previewUrl }` | 校验 + 生成二维码 + 返回预览 |
| POST | `/api/admin/orders/[slug]/archive` | `{}` | `{ ok }` | 打包 zip → 删 public 资源 |
| GET | `/api/health` | — | `{ ok, version, uptime }` | 监控用 |

**`POST /api/admin/orders/[slug]/build` 的执行顺序**

1. `loadStory()` + Zod 校验（失败直接返回 422 与错误路径）
2. 检查 `public/orders/{slug}/` 里引用的文件是否都存在（缺一个就 422 并列出）
3. 生成 `qr.png`
4. 检查图片总体积，> 3.5MB 返回 `warn`（不阻断）
5. 返回 `{ previewUrl: "/s/{slug}?preview=1" }`

### 9.4 错误码

| code | HTTP | 场景 | 前端表现 |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | 后台 Cookie 失效 | 跳登录 |
| `FORBIDDEN` | 403 | 预览态越权 | 显示 403 页 |
| `NOT_FOUND` | 404 | slug 不存在 | 404 页 |
| `GONE` | 410 | 已归档/过期 | 「已归档」页 |
| `BAD_PASSWORD` | 401 | 密码错 | 抖动 + 计数 |
| `RATE_LIMITED` | 429 | 锁定中 | 「稍后再试」+ 倒计时 |
| `SCHEMA_INVALID` | 422 | story.json 不合规 | 展示 Zod 路径 |
| `ASSET_MISSING` | 422 | 图片缺失 | 列出缺失文件 |
| `AUDIO_TOO_LARGE` | 422 | 音频超限 | 「请压缩到 3MB 内」 |
| `INTERNAL` | 500 | 兜底 | 500 页 + 日志 |

---

## 10. 暂不实现：印刷（v2）

v1 只交付电子版。这一章只记录「为什么现在不做」和「为了以后不重写，现在必须守住什么」，**不含任何实现要求**。读到这里的 Agent 请直接跳过，不要创建 print 路由、不要装渲染 PDF 的依赖。

### 10.1 为什么推迟

| 原因 | 说明 |
|---|---|
| 现金流 | 电子版 ¥399 当天回款；印刷要垫付、等打样、处理退换 |
| 交付风险 | 一本册子出错就是重印赔钱；一个链接出错改一次就行 |
| 验证速度 | 先证明有人愿意为「一个网页」付 ¥399，再谈加价卖实物 |
| 开发成本 | 300dpi、出血、CMYK、24P 排版，约占整体工期的 40% |

### 10.2 现在必须守住的三件事（否则 v2 要重写）

1. **原图永不删除**：`content/orders/{slug}/raw/` 里的原图一直留着。线上只用 1600px，但印 300dpi 需要长边 3000px，回头再找客户要图是灾难。
2. **数据里不出现物理尺寸**：`story.json` 不写「页」「mm」「dpi」这类字段。印刷是渲染层的事，不是数据的事。
3. **章节组件不依赖滚动**：每个章节组件只吃 `data`，不读 `window`、不读滚动位置。这样将来做固定页排版时，视觉可直接复用，只重写外层布局。

### 10.3 v2 的启动条件

同时满足才启动：连续 2 个月每月 ≥ 8 单，且有 ≥ 5 个客户主动问「能不能印出来」。启动时**新建** `PRINT_SPEC.md`，不要往本文档里加内容。

---

## 11. 性能、兼容、可访问性

### 11.1 性能预算（构建时断言，超标 CI 失败）

| 指标 | 预算 |
|---|---|
| 单页 JS（gzip） | 150 KB |
| 首屏 CSS | 30 KB |
| 首屏图片 | 300 KB |
| HTML | 60 KB |
| LCP（4G 模拟） | < 2.5s |
| CLS | < 0.05 |
| INP | < 200ms |

手段（按优先级）：
1. 章节按需加载：`next/dynamic` 只对 `Lightbox`、`Zhuazhou`、`PosterButton` 用
2. Framer Motion 只引 `motion`、`useScroll`、`AnimatePresence`，禁止 `import * as`
3. 无第三方统计、无字体文件、无图标库（图标用内联 SVG）
4. 图片三档 + AVIF，首屏图 `preload`

### 11.2 兼容矩阵

| 环境 | 版本 | 必须验证 |
|---|---|---|
| 微信内置浏览器（iOS） | 最新 | 音乐、长按保存、字体、`100dvh` |
| 微信内置浏览器（Android / X5） | 最新 | 音乐、滚动性能、图片解码 |
| iOS Safari | 15+ | `dvh`、`scroll-behavior`、`backdrop-filter` 降级 |
| Android Chrome | 100+ | 全量 |
| 桌面 Chrome / Safari | 最新 | 灯箱键盘、章节导航 |

已知坑与对策：

| 坑 | 对策 |
|---|---|
| iOS 上 `100vh` 包含地址栏 | 用 `100dvh`，回退 `100vh`（`@supports (height:100dvh)`） |
| 微信禁止自动播放 | 必须用户点击，按钮常驻 |
| 微信长按图片弹出菜单 | 海报按钮提示「长按保存」，`-webkit-touch-callout: none` 只加在非图片元素 |
| X5 内核不支持 `aspect-ratio`（旧版） | 用 padding-top 百分比兜底 |
| iOS 滚动中 `position: fixed` 抖动 | 音乐按钮用 `transform: translateZ(0)` 提升合成层 |

### 11.3 可访问性

- 所有图片有 `alt`（`Photo.alt` 必填，缺省用「宝宝照片」）
- 灯箱：`role="dialog"`、`aria-modal`、焦点锁定、`Esc` 关闭、关闭后焦点回到触发元素
- 对比度：正文 ≥ 7:1，次级 ≥ 4.5:1，`film` 主题单独校验
- 键盘可达：所有 `button` 有 `:focus-visible` 样式（2px `--c-accent` outline，offset 2px）
- 动效尊重 `prefers-reduced-motion`
- 语义：一章一个 `<section aria-labelledby>`，标题用 `<h2>`，封面姓名用 `<h1>`（全页唯一）

---

## 12. 安全与合规

### 12.1 必须做到的六件事

1. **不入索引**：`robots.txt` 全站 `Disallow: /s/`；页面 `<meta name="robots" content="noindex,nofollow">`；响应头 `X-Robots-Tag`
2. **默认有密码**：建单时强制生成 4 位密码，不允许「先不设密码」
3. **正文不下发**：未解锁时未来信正文不出现在 HTML / RSC payload 里
4. **不落第三方**：不接百度统计、GA、Sentry 等任何会把 URL 带出去的 SDK
5. **原图不外泄**：`raw/` 目录永不被静态服务；构建时校验 `public/` 下无 `raw` 引用
6. **到期即删**：`expiresAt` 后中间件返回 410，定时任务打包归档并 `rm -rf public/orders/{slug}`

### 12.2 合规措辞（写进订单备注与合同）

> 本服务仅用于家庭内部纪念。所有照片与文字由客户提供并授权使用，未经监护人书面同意，不用于任何公开展示、案例库或宣传物料。托管期满后，线上页面将归档下线，客户可申请打包一份离线文件自行保存。

### 12.3 技术侧风险

| 风险 | 对策 |
|---|---|
| 域名被微信拦截 | 主备双域名，二维码印备用短链，交付话术中说明 |
| 服务器被刷 | 密码页与 unlock 接口限流（IP + slug 双维度） |
| 磁盘被图片塞满 | 单订单目录上限 500MB，超限拒绝上传 |
| 误删订单 | 归档不删除：`archive/{slug}-{date}.tar.gz` 保留 24 个月 |
| `AUTH_SECRET` 泄露 | 环境变量注入，泄露即轮换（所有 Cookie 失效，客户重新输密码） |

---


## 13. 测试与验收

### 13.1 单元测试（Vitest，覆盖率 > 70%）

| 文件 | 用例 |
|---|---|
| `lib/schema.test.ts` | 合法 JSON 通过；缺字段报错并指出路径；`unlockAt` 早于生日报错；超长文本报错 |
| `lib/date.test.ts` | 周岁文案（365 天/1 岁 3 个月）；倒计时跨时区（`Asia/Shanghai`）；生日当天边界 |
| `lib/story.test.ts` | `normalize` 排序、缺月补位、去重、超过 60 张截断、未解锁正文被清空 |
| `lib/auth.test.ts` | HMAC 签名/验签；过期失效；篡改失效；时间安全比较 |
| `lib/poster.test.ts` | 文案超长截断（纯函数部分） |

### 13.2 端到端（Playwright，`pnpm e2e`）

| # | 场景 | 断言 |
|---|---|---|
| E1 | 未登录访问 `/s/bb-20250417` | 显示密码页；HTML 中不含宝宝姓名以外的内容 |
| E2 | 输入错误密码 5 次 | 第 5 次后锁定，提示「60 秒后再试」 |
| E3 | 输入正确密码 | 跳转纪念页，9 个 section 均存在 |
| E4 | 滚动到未来信 | 未到解锁日 → 显示倒计时；页面源码中无正文 |
| E5 | 把系统时间改到解锁日（mock 服务端时间） | 显示正文 |
| E6 | 点击照片 | 灯箱打开；`Esc` 关闭；焦点回到原图 |
| E7 | 抓周 | 点 1 个 → 其余淡出 → 结果卡出现 → 「再抓一次」恢复 |
| E8 | 后台建单 | 新订单出现，预览可打开，状态为 `draft` |
| E9 | 过期订单 | 返回 410 + 「已归档」页 |
| E10 | 触摸端（iPhone 13 模拟） | 首屏无横向滚动；音乐按钮可点；海报按钮可生成 |
| E11 | 只给 9 个月照片（造一份缺月数据） | 缺的 3 个月显示虚线占位卡，页面不报错（C-01） |
| E12 | 生日当天 00:00（mock 服务端时间） | 封面天数显示 365，文案变为「一岁了」（T-03） |
| E13 | 闰年出生（2024-02-29） | 周岁按次年 2/28 计算，不抛异常（T-01） |
| E14 | 分享链接 | `og:image` 返回 200 且尺寸 1200×630；`title` ≤ 15 字（P-01/P-02） |
| E15 | 后台把状态从 `paid` 直接改成 `delivered` | 被拒绝，提示「素材未齐，不能交付」（2.2 迁移校验） |
| E16 | 归档后访问 | 410；归档包存在且能解开（18.5） |

### 13.3 人工验收（每次交付前，10 分钟）

- [ ] 真机（iPhone + 安卓各一台）打开，封面 2 秒内出图
- [ ] 12 个月照片方向正确、无人脸被裁
- [ ] 音乐能播、能停、切后台会停
- [ ] 信件打字机完整播完，字数与后台一致
- [ ] 未来信倒计时天数与手算一致
- [ ] 分享海报保存后发到微信，文字不糊、二维码可扫
- [ ] 二维码扫码能直达（不是跳到首页）
- [ ] 微信里点右上角「…」，标题显示为「小满的一周岁」
- [ ] 把链接发给一个没打开过的手机，输入密码到看完，全程无卡顿
- [ ] 半年后再打开一次，确认「未来信」仍是锁定态
- [ ] 打开第 15 章，把该单涉及的 P0 场景逐条过一遍（尤其 S-01/02/12，C-06/07，T-05，P-01/02）

---

## 14. 实施计划

### 14.1 九个 PR（按序，不可并行）

| # | 名称 | 主要文件 | DoD（完成定义） |
|---|---|---|---|
| PR1 | 脚手架与设计系统 | `app/layout.tsx` `globals.css` `themes.css` `tailwind.config.ts` | 本地起服务；空页面上三种主题可切换（临时按钮）；`pnpm build` 通过 |
| PR2 | 数据层 | `lib/types.ts` `schema.ts` `story.ts` `content/orders/bb-20250417/` | `loadStory` 能读取示例订单；Zod 报错信息可读；`vitest` 4 个用例通过 |
| PR3 | 访问控制 | `middleware.ts` `api/unlock` `gate/[slug]` `lib/auth.ts` | E1–E3 通过；Cookie 篡改后失效 |
| PR4 | 前四章 | `sections/Hero` `Timeline12` `Growth` `Zhuazhou` | 真机可滚动浏览；抓周可交互；无 JS 时文字仍可读 |
| PR5 | 后五章 | `sections/Gallery` `Letter` `FutureLetter` `Guestbook` `Outro` + `Lightbox` `Typewriter` | E4–E7 通过；未来信正文不在 HTML |
| PR6 | 全局与图片 | `SmartImage` `AmbientAudio` `SectionNav` `scripts/assets.ts` | 首屏 < 1.5s（4G 模拟）；图片总量报告 < 3.5MB |
| PR7 | 后台 | `admin/**` | E8 通过；建单 → 预览全流程不碰命令行 |
| PR8 | 上传与构建 | `api/admin/orders/[slug]/assets` `build` `scripts/qr.ts` | 拖 20 张图 → 自动处理 → 缺图检查 → 生成二维码 |
| PR9 | 打磨与上线 | 性能、兼容、`scripts/archive.ts`、测试补全 | 13.2 全绿；13.3 人工清单打勾；正式域名可交付 |

### 14.2 12 天排期

| 天 | 任务 | 产出 |
|---|---|---|
| D1–D2 | PR1 + PR2 | 脚手架 + 数据层，示例订单能渲染 |
| D3–D4 | PR3 + PR4 | 密码门 + 前四章 |
| D5–D6 | PR5 | 后五章 + 灯箱 + 打字机 |
| D7 | PR6 | 图片管线 + 全局组件 + 性能达标 |
| D8–D9 | PR7 | 后台三页 |
| D10 | PR8 | 上传与一键构建 |
| D11 | PR9 | 性能/兼容修复 + 归档脚本 + 测试补全 |
| D12 | 内测 | 给 1 个真实客户做一单，记录所有卡点 |

**排期纪律**：D6 结束若后五章没跑通，砍掉 `zhuazhou` 与 `guestbook`，先保证「封面 + 十二个月 + 信 + 未来信 + 结尾」这条情绪主线可交付。

### 14.3 每个 PR 的提交前检查

```bash
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint
pnpm test          # vitest run
pnpm build         # next build 必须成功
```

四个命令全绿才能提 PR。CI 里同样跑这四条 + `pnpm e2e`（仅 PR8 之后）。

---

## 15. 场景全量清单

这一章是「把所有能想到的情况先想一遍」。编号是固定的，PR 描述、客服话术、测试用例都引用它。

**共 93 个场景：P0 37 个（不做就不能交付）、P1 45 个（首版应该有）、P2 11 个（以后再说）。**
**优先级**：`P0` 不做就不能交付 / `P1` 首版应该有 / `P2` 可以以后再说。
**归属**：`前端` `后端` `数据` `运营`。运营类不写代码，但要写进 SOP。

**用法**：写某个组件前，先在第 15.9 节找到它对应的场景组，把该组 P0 项逐条对照实现；PR 描述里贴一句「已覆盖 S-01、S-02、S-03」。

### 15.1 访客阅读（S）

| 编号 | 场景 | 期望行为 | 归属 | 优先级 |
|---|---|---|---|---|
| S-01 | 亲友第一次在微信里点开 | 3 秒内看到密码页；输入 4 位后直接进封面，不要求任何账号 | 前端 | P0 |
| S-02 | 老人不会输密码 | 提示语固定为「输入宝宝生日（4 位）」；输错不清空输入；转发者可直接把密码告诉对方 | 前端/运营 | P0 |
| S-03 | 亲戚在国外（时区差 8–15 小时） | 所有日期按 `Asia/Shanghai` 渲染，不随访客本地时区变化 | 前端 | P0 |
| S-04 | 深夜打开 | 不自动播放音乐；封面从深色渐入，避免整屏白闪 | 前端 | P1 |
| S-05 | 只看封面就退出 | 不弹窗、不挽留。封面本身要能独立成立（姓名 + 寄语 + 日期） | 前端 | P1 |
| S-06 | 一口气滑到底 | 全页无卡顿；图片懒加载不引起布局跳动（CLS < 0.05） | 前端 | P0 |
| S-07 | 同一个人反复打开 | 7 天内免输密码（Cookie） | 后端 | P1 |
| S-08 | 换了手机再打开 | 需要重新输密码（Cookie 不跨设备），这是预期行为 | 后端 | P1 |
| S-09 | 用 iPad / 折叠屏打开 | 内容居中、最大宽 720px，两侧留底色，不拉伸不变形 | 前端 | P1 |
| S-10 | 用电脑打开 | 右侧章节导航出现，键盘可操作，图片限宽不糊 | 前端 | P1 |
| S-11 | 链接被转到「家人」以外 | 仍能看到（密码即门票），但页面底部常驻一行「仅限家人查看」 | 前端 | P1 |
| S-12 | 有人截图转发 | 无法阻止。因此页面只显示小名，不显示全名、不显示出生医院 | 产品 | P0 |
| S-13 | 手机静音 / 关闭声音 | 所有内容可读，音乐只是加分项，不是必需 | 前端 | P0 |
| S-14 | 只有 2G 信号 | HTML 先到：至少能看到封面底色、姓名、寄语；图片后续渐进出现 | 前端 | P2 |

### 15.2 内容异常（C）

| 编号 | 场景 | 期望行为 | 归属 | 优先级 |
|---|---|---|---|---|
| C-01 | 只给了 9 个月的照片 | 缺的月份渲染虚线占位卡，不报错；后台黄条提示「还差 3 个月」 | 前端/运营 | P0 |
| C-02 | 照片是 iPhone 直出的 HEIC | 上传管线自动转 JPG/AVIF，客户无感 | 数据 | P0 |
| C-03 | 横图、竖图混着发 | 统一按容器比例 `cover` 裁切，人脸靠 `object-position: center 30%` 保住 | 前端 | P0 |
| C-04 | 照片自带日期水印 | 上线前提示可代修（¥20/张），不修也允许上线 | 运营 | P1 |
| C-05 | 照片里有别人家孩子 | 提示需对方家长同意；不做技术拦截 | 运营 | P0 |
| C-06 | 照片是洗澡/裸体照 | **拒收**，说明原因，给替代方案（背影、裹浴巾） | 运营 | P0 |
| C-07 | EXIF 里有家庭住址 | 管线清空全部 EXIF，原图只在 `raw/` 保留 | 数据 | P0 |
| C-08 | 客户发来视频 | v1 不支持嵌入；建议截 3 帧当照片，或做「视频版」加购（v2） | 运营 | P1 |
| C-09 | 发来 GIF / 表情包 | 取首帧转静图，或直接不用 | 数据 | P2 |
| C-10 | 照片分辨率 < 800px | 提示「会糊」，仍可上线，但按实际尺寸显示不加锐化 | 前端/运营 | P1 |
| C-11 | 一封信写了 2000 字 | 后台拒绝保存，提示「控制在 800 字内，或拆成两段」 | 后端 | P1 |
| C-12 | 客户不想写未来信 | 关掉该章节，页面其余部分照常；不显示空壳 | 前端 | P1 |
| C-13 | 一条祝福语都没有 | 整章跳过；不在页面上留「暂无祝福」 | 前端 | P1 |
| C-14 | 客户要求放某首流行歌 | 说明版权风险；改用曲库，或客户自签免责并自行上传 | 运营 | P0 |
| C-15 | 宝宝小名是生僻字（如「䶮」） | 系统字体可能缺字：正文回退到系统字体，海报改用图片化或注音 | 前端 | P1 |
| C-16 | 双胞胎 | v1 只做单宝宝：**拆成两单**（`bb-xxx-a` / `bb-xxx-b`），封面与时间轴各自独立；并列双名留给 v2 | 运营 | P1 |

### 15.3 设备与网络（D）

| 编号 | 场景 | 期望行为 | 归属 | 优先级 |
|---|---|---|---|---|
| D-01 | iOS 低电量模式 | 音频无法自动播放；按钮仍在，点击后无反应则置灰，不报错 | 前端 | P1 |
| D-02 | 旧版微信 X5 内核 | 不支持 `aspect-ratio`，用 padding-top 百分比兜底 | 前端 | P1 |
| D-03 | 鸿蒙 / 华为浏览器 | 基础滚动与图片正常；不依赖 `-webkit-` 私有特性 | 前端 | P1 |
| D-04 | 系统开了深色模式 | 页面不跟随系统（主题由运营选定），但 film 主题本身已适配暗色 | 前端 | P1 |
| D-05 | 系统字号调到最大 | 布局不塌：字号用 `rem` + `clamp()`，容器用 `min()` 限制 | 前端 | P1 |
| D-06 | 3G 弱网 | 首屏 3 秒内可用；图片按 `srcset` 降级 | 前端 | P1 |
| D-07 | 断网 10 秒后恢复 | 不白屏；已加载内容可读，图片显示占位后重试 | 前端 | P2 |
| D-08 | 三年前的老安卓，内存 2G | 控制同屏 DOM 数量：照片墙分页渲染（每次 12 张，滚动加载） | 前端 | P1 |
| D-09 | 微信浮窗切走再切回 | 不重新加载、不重播动画、音乐保持暂停 | 前端 | P2 |
| D-10 | 微信缓存了旧版本页面 | 静态资源带 hash，HTML 带 `no-store`，避免看到旧内容 | 后端 | P1 |
| D-11 | 320px 窄屏（iPhone SE 一代） | 不出现横向滚动；姓名不换行溢出 | 前端 | P2 |
| D-12 | 平板横屏 | 最大宽 720 居中，背景色延展到两侧 | 前端 | P2 |
| D-13 | 生日宴现场，200 位亲友同时扫码 | 单页 SSR 可承载；静态资源走 Nginx 长缓存、图片走 CDN；压测 300 并发 P95 < 800ms | 后端 | P0 |

### 15.4 时间与日期（T）

| 编号 | 场景 | 期望行为 | 归属 | 优先级 |
|---|---|---|---|---|
| T-01 | 生日是 2 月 29 日 | 周岁按「次年 2 月 28 日」计算，写死规则并在后台标注 | 后端 | P1 |
| T-02 | 客户报的是农历生日 | 只收公历，建单时提示「请填公历」 | 运营 | P1 |
| T-03 | 生日当天 00:00 打开 | 天数显示 365，文案从「还有 N 天」变为「一岁了」 | 后端 | P0 |
| T-04 | 提前 3 天交付 | 页面正常；「一岁」以生日当天为准，不因提前交付而提前 | 后端 | P1 |
| T-05 | 未来信解锁日 = 18 岁生日 | 当日 `Asia/Shanghai` 00:00 起可读；此前服务端不下发正文 | 后端 | P0 |
| T-06 | 访客手机时间被调错 | 一切以服务端时间为准，前端不参与判断 | 后端 | P0 |
| T-07 | 出生那年是闰年 | 文案用「366 天」而不是「1 年」，避免差一天 | 后端 | P1 |
| T-08 | 12 月 31 日出生，1 月 1 日查看 | 显示「1 天」，不显示「0 岁」 | 后端 | P1 |
| T-09 | 托管到期当天 | 返回 410 + 解释页（「已归档，可联系 xxx」），不用 404 | 后端 | P1 |
| T-10 | 客户申请延长托管 | 后台改 `expiresAt` 即时生效，无需重新构建 | 后端 | P1 |

### 15.5 分享与传播（P）

| 编号 | 场景 | 期望行为 | 归属 | 优先级 |
|---|---|---|---|---|
| P-01 | 微信分享卡片没有缩略图 | 必须有 `og:image`（1200×630），指向封面裁切版 | 后端 | P0 |
| P-02 | 标题被截断成「小满的…」 | `title` ≤ 15 字，格式固定「小满的一周岁」 | 运营 | P0 |
| P-03 | 二维码印在请柬、蛋糕牌上 | 尺寸 ≥ 4cm；深底用白码；四周留 4 模块静区 | 运营 | P1 |
| P-04 | 扫码后跳微信内置浏览器 | 正常打开密码页，不跳外部浏览器 | 前端 | P0 |
| P-05 | 二维码被识别成一串文字 | 走短链（`/q/xxxx`）而不是长 URL | 后端 | P1 |
| P-06 | 群里有人打不开（域名被拦） | 备用域名 + 短链；交付时附一句「打不开就用浏览器打开」 | 运营 | P1 |
| P-07 | 客户想要朋友圈九宫格 | 海报之外再提供 9 张 1:1 方图（封面 + 8 张精选，自动裁切） | 后端 | P2 |
| P-08 | 生日宴现场要投屏 | 提供 `?mode=stage` 大屏模式：隐藏密码页与导航、字号放大 1.4 倍、循环播放章节 | 前端 | P2 |
| P-09 | 客户问「能不能下载成 PDF」 | 明确说 v1 不做；可给海报，或建议截图 | 运营 | P0 |
| P-10 | 客户想把页面放进公众号 | 微信不允许正文外链，说明限制并给替代（阅读原文） | 运营 | P1 |

### 15.6 家庭形态（F）

> 这一组不是技术问题，是**接单判断**。处理不当会伤到人，也会伤到口碑。

| 编号 | 场景 | 期望行为 | 归属 | 优先级 |
|---|---|---|---|---|
| F-01 | 单亲妈妈 | 文案只出现「妈妈」，不强行补「爸爸」；问候语避免「爸爸妈妈」连写 | 运营 | P0 |
| F-02 | 离异家庭 | 双方照片与称呼需客户明确确认；页面不做任何评价性描述 | 运营 | P0 |
| F-03 | 领养家庭 | 不出现「亲生」「血脉」「遗传」等词 | 运营 | P0 |
| F-04 | 家里有二宝 | 页面只讲老大；底部可放一句「妹妹篇明年见」，为复购埋点 | 运营 | P1 |
| F-05 | 双胞胎 | 见 C-16：拆单或并列两个名字，共享一套照片时分别标注 | 产品 | P1 |
| F-06 | 早产儿 | 成长曲线按实际月龄，不自动矫正；后台备注「矫正月龄」供文案参考 | 运营 | P2 |
| F-07 | 宝宝已故 / 失独家庭 | **不接单**，用固定话术婉拒，不追问、不推荐替代品 | 运营 | P0 |
| F-08 | 跨国 / 多语言家庭 | 页面中文为主；祝福语允许英文；字体需覆盖拉丁与中文 | 前端 | P2 |

### 15.7 商务与运营（B）

| 编号 | 场景 | 期望行为 | 归属 | 优先级 |
|---|---|---|---|---|
| B-01 | 客户记错生日，要改 | 改 `birthday` + 重算天数，10 分钟内完成，不收钱 | 运营 | P0 |
| B-02 | 交付后要加照片 | 按 ¥30/页 或打包价；改 JSON + 传图 + 重新生成，30 分钟 | 运营 | P1 |
| B-03 | 客户想换主题 | 改 `theme` 一个字段，其它不动，立即生效 | 运营 | P1 |
| B-04 | 客户催单 | 走加急档（+30%），不承诺「尽量」 | 运营 | P0 |
| B-05 | 客户收定金后失联 7 天 | 标记「待定」，不占排期；第 14 天再提醒一次 | 运营 | P1 |
| B-06 | 客户要退款 | 未开始全退；已交付不退；已做一半退 50% | 运营 | P0 |
| B-07 | 客户砍价 | 减配置不减单价（去掉加急、去掉定制域名） | 运营 | P0 |
| B-08 | 客户要开发票 | v1 不提供，如实说明 | 运营 | P1 |
| B-09 | 同行来问实现细节 | 不透露技术栈与供应商 | 运营 | P1 |
| B-10 | 客户以为「买了就永久在线」 | 交付时明确托管期限与续费价（¥99/年） | 运营 | P0 |
| B-11 | 生日前一天才下单 | 只接标准版，且明确「素材今晚必须齐，否则顺延」 | 运营 | P0 |
| B-12 | 客户说「你帮我写这封信」 | 加价 ¥100 代写，或用 AI 出初稿再由客户改 | 运营 | P1 |

### 15.8 安全与隐私（X）

| 编号 | 场景 | 期望行为 | 归属 | 优先级 |
|---|---|---|---|---|
| X-01 | 密码是 0417 这种弱口令 | 允许（链接本身是第二道门），但限制尝试次数 | 后端 | P0 |
| X-02 | 链接被转到公开群 | 仍受密码保护；监控单日访问量异常（> 200 UV 报警） | 后端 | P1 |
| X-03 | 有人暴力破解密码 | 同 IP 5 次锁 60 秒；同 slug 全天累计 50 次锁 24 小时 | 后端 | P1 |
| X-04 | 后台密码泄露 | 立即轮换 `ADMIN_PASSWORD`，审计最近登录 IP | 后端 | P0 |
| X-05 | 服务器被入侵 | 数据库只有元数据；照片在文件系统且备份加密；不存支付信息 | 后端 | P1 |
| X-06 | 客户要求删除全部数据 | 48 小时内删除线上 + 备份，出具删除回执（见 18.3） | 后端/运营 | P0 |
| X-07 | 父母一方要求下线（监护权争议） | 立即下线，暂停服务，等双方书面一致再恢复 | 运营 | P0 |
| X-08 | 陌生人/记者索要照片 | 一律拒绝，不确认也不否认该订单存在 | 运营 | P0 |
| X-09 | 被搜索引擎收录 | 每月 `site:` 抽查一次；发现即提交删除并检查响应头 | 运营 | P0 |
| X-10 | 未来招兼职帮忙做图 | 最小权限（只能看分配给自己的单），签保密协议 | 运营 | P2 |

### 15.9 场景 → 实现映射

写代码时按这张表找位置，别自己发明。

| 场景组 | 主要落点 | 对应测试 |
|---|---|---|
| S-01 ~ S-08 | `middleware.ts`、`app/gate/[slug]`、`lib/auth.ts` | E1–E3 |
| S-09 ~ S-14 | `app/globals.css`（`max-width: 720px`）、`SmartImage` | E10、人工 |
| C-01 ~ C-14 | `normalize()` 占位补位、`scripts/assets.ts`、后台校验 | 单测 + 人工 |
| C-15 ~ C-16 | 字体栈回退、双胞胎拆单规则（运营） | 人工 |
| D-01 ~ D-12 | `globals.css` 降级、`next/config` 头、`AmbientAudio` | E10、人工 |
| T-01 ~ T-10 | `lib/date.ts`（唯一时间源）、`futureLetter` 服务端判断 | 单测 + E4/E5/E9 |
| P-01 ~ P-10 | `generateMetadata`、`scripts/qr.ts`、`Outro` | E7、人工 |
| F-01 ~ F-08 | 不写代码，进客服话术与接单检查表 | 人工 |
| B-01 ~ B-12 | 后台改字段 + 状态机 | 人工 |
| X-01 ~ X-10 | `lib/auth.ts` 限流、`scripts/archive.ts`、运维 SOP | E2 + 人工 |

---

## 16. 应急手册（Runbook）

生日当天出问题，客户是没有耐心的。每条都按「症状 → 先判断 → 动作 → 对客户怎么说」写。

### 16.1 生日当天打不开

- **症状**：客户说「链接点开是白的 / 一直转圈」
- **先判断**：让客户截图。看是 404、410、还是白屏。自己用手机 4G 打开同一链接复现
- **动作**：① 复现 → ② 看服务是否存活（`/api/health`）→ ③ 看 Nginx 日志 → ④ 若域名被拦，立刻给备用域名短链 → ⑤ 若服务挂了，`pm2 restart`，30 秒内恢复
- **话术**：「我这边已经恢复了，您再点一次这个新链接（附短链）。如果还不行，用浏览器打开也一样。」

### 16.2 密码进不去

- **症状**：「密码不对」但客户坚称没打错
- **先判断**：后台看密码字段是否被改过；看是否触发了锁定（429）
- **动作**：① 锁定则等 60 秒或换 IP；② 后台重置密码并微信告知；③ 顺手确认客户是不是打开了旧链接（另一个 slug）
- **话术**：「密码我重置成 0417 了，您再试一次。刚才可能是试太多次被临时锁了，一分钟就好。」

### 16.3 图片不显示 / 很糊

- **症状**：部分图空白，或糊成马赛克
- **先判断**：是没加载（网络/路径 404）还是加载了但分辨率低
- **动作**：① 开发者工具看 404 的文件名 → 补文件重跑管线；② 糊的话看原图长边，< 800px 就是素材问题，如实告知；③ CDN 缓存问题则刷新目录
- **话术**：「这张原图本身只有 600 像素宽，放大就会糊。您要是能找到原图，我十分钟给您换上。」

### 16.4 二维码扫不出来

- **症状**：印刷品上的码扫不出 / 扫出来是乱码
- **先判断**：是码太小、对比度不够，还是印歪了
- **动作**：① 用三个不同手机扫；② 尺寸 < 3cm 就重出大码；③ 改短链重新生成；④ 交付时同时给「文字链接」，让客户可以手动发
- **话术**：「我重新出了一版更大的码，您让店家按 4 厘米以上印。另外文字链接也发您，实在扫不出可以直接发这个。」

### 16.5 客户临时要改

- **症状**：「能不能再加几张照片 / 换个颜色 / 改句话」
- **先判断**：是交付前还是交付后；改动量多大
- **动作**：① 交付前 2 轮内免费；② 交付后按 ¥30/页；③ 只改文案不收费；④ 每次改动记进 `revisions`
- **话术**：「加照片可以，按 30 块一页；只改一句话我今晚就帮您改好，不收钱。」

### 16.6 客户要求删除 / 下线

- **症状**：「不想给别人看了 / 帮我删掉」
- **动作**：① 先下线（改 `expiresAt` 为昨天，立即 410）；② 24 小时内删除 `public/` 资源；③ 7 天内删除备份；④ 出具删除回执
- **话术**：「已经下线了，现在打不开。原始文件我今天内删掉，备份一周内清完，到时候给您一个删除确认。」

### 16.7 服务器 / 磁盘出问题

- **症状**：整站 502、上传失败、构建报错
- **动作**：① `pm2 status` + `df -h`；② 磁盘 > 85% 就先归档旧订单；③ 内存不足则加 swap；④ 恢复流程见 18.5
- **话术**：（对客户）「系统在做例行维护，十分钟内恢复，链接不会变。」

### 16.8 被微信拦截

- **症状**：微信里提示「已停止访问该网页」
- **动作**：① 立刻切备用域名（二维码印的是短链，短链可改指向）；② 提交申诉；③ 检查页面是否有敏感词/外链
- **话术**：「微信误拦了，我换了个地址，您点新的这个，内容一模一样。」

### 16.9 客户情绪激动 / 投诉

- **动作**：① 先道歉不解释；② 给出一个具体时间点；③ 超时未解决主动再联系一次；④ 该退就退，别争
- **话术**：「这事儿是我们没做好。您给我半小时，半小时后不管好没好，我都给您回个话。」

---

## 17. 内容边界与敏感场景

做的是别人家孩子的东西，**什么能接、什么不能接，比技术更重要**。

### 17.1 三种必须拒接的单

| 类型 | 为什么 | 怎么拒绝 |
|---|---|---|
| 失独 / 宝宝已故的纪念 | 情绪强度远超我们的能力边界，做不好是二次伤害 | 「这个我做不了，怕做不好。您可以找专门做纪念品的机构。」 |
| 要求公开传播 / 引流用 | 儿童照片公开违反我们自己的红线 | 「我们的页面默认带密码、不进搜索引擎，这条不能改。」 |
| 要求伪造（改出生日期、P 图换脸） | 伦理与法律风险 | 「照片可以修色调，但不能改人。」 |

### 17.2 家庭形态适配

| 形态 | 文案调整 | 结构建议 |
|---|---|---|
| 单亲 | 只用实际在场的人称；不写「爸爸妈妈」 | 信件 `from` 设为「妈妈」 |
| 离异 | 双方照片需明确授权；不并列「全家福」 | 照片墙去掉合影，或只放客户指定的一张 |
| 领养 | 去掉「血脉」「亲生」「遗传」 | 无结构变化 |
| 二宝 | 明确这是老大的页面 | 结尾加「妹妹篇明年见」 |
| 双胞胎 | 两个名字不能挤在一个封面 | 拆两单：`slug` 加 `-a`/`-b`，封面与时间轴各自独立；共享照片时各自标注「哥哥/弟弟」 |
| 早产 | 不主动提「矫正月龄」 | 曲线按实际月龄，备注里写 |

### 17.3 称呼词库（下拉选项，避免客户自己写错）

```
妈妈 / 爸爸 / 爸爸妈妈 / 外婆 / 外公 / 奶奶 / 爷爷
姥姥 / 姥爷 / 姑姑 / 舅舅 / 阿姨 / 干妈 / 其他（手填）
```

祝福语落款必须从词库选或手填，不允许空着——空着会让页面显得没做完。

### 17.4 措辞禁忌

| 不要写 | 改成 |
|---|---|
| 永远离开了 / 去了天堂 | （不接此类订单） |
| 你是我们唯一的希望 | 你是我们最想要的礼物 |
| 希望你以后孝顺我们 | 希望你以后有人爱，也懂得爱人 |
| 终于生出来了 / 遭了那么多罪 | 你来的那天，我们等了很久 |
| 长得像爸爸/妈妈（比较意味） | 你有你自己的样子 |
| 第一名 / 最聪明 / 最漂亮 | 具体的细节（第一次笑出声、抓到了画笔） |

原则：**写具体的事，不写评价性的词**。「第一次扶着沙发站起来」永远比「特别聪明」动人。

### 17.5 照片红线

- 不接：全裸、洗澡、医院插管、遗照
- 慎用：病房照、产妇照、其他孩子正脸（需授权）
- 必须有：一张清晰的单人正脸，作为封面或第一屏

### 17.6 客户文案的三种改法

| 客户写的 | 问题 | 改法 |
|---|---|---|
| 「感谢你来到我们家，你是我们全部的希望」 | 太重，把孩子当成寄托 | 保留情感，落到具体：「谢谢你选中我们。这一年，你教会我们怎么当一个不完美的大人。」 |
| 一大段流水账（800 字） | 读不完，打字机会播 40 秒 | 拆成 3 段，每段一句重点，其余放照片说明 |
| 全是「希望你……」 | 像训话，不像信 | 至少留一句「我希望我自己……」，把期待分一半给自己 |

**改稿原则**：不改客户的情感，只改句子的落点。改完必须发回客户确认。

---

## 18. 数据生命周期

### 18.1 数据分级

| 级别 | 内容 | 位置 | 谁能看 |
|---|---|---|---|
| L1 极敏感 | 客户原图（含 EXIF）、未来信正文 | `content/orders/{slug}/raw/`、`story.json` | 仅运营本人 |
| L2 敏感 | 线上成品图、纪念页内容 | `public/orders/{slug}/` | 持密码的访客 |
| L3 内部 | 订单表（姓名、生日、联系方式） | SQLite | 仅运营 |
| L4 可公开 | 页面访问事件（无身份） | `logs/events-*.jsonl` | 仅运营 |

### 18.2 留存矩阵

| 数据 | 保留期 | 到期动作 |
|---|---|---|
| 线上页面 | 至 `expiresAt`（标准 12 个月 / 尊享 36 个月） | 410 下线，资源删除 |
| 原始素材 `raw/` | 交付后 24 个月 | 打包归档后删除 |
| 归档包 | 归档后 24 个月 | 删除 |
| 订单记录 | 5 年（财务留痕） | 仅保留金额与日期，删除姓名与联系方式 |
| 事件日志 | 90 天 | 自动清理 |
| 备份 | 30 天滚动 | 自动覆盖 |

### 18.3 删除流程

1. 客户提出（微信/口头即可，不要求书面）
2. 立即下线：`expiresAt` 改为昨天 → 访问返回 410
3. 24 小时内：删除 `public/orders/{slug}/` 与 `content/orders/{slug}/raw/`
4. 7 天内：轮转备份，使旧备份自然过期
5. 出具回执（模板如下）

```
【删除确认】
订单：bb-20250417（小满）
已删除：线上页面、全部照片与音频、原始素材
保留：订单金额与日期（仅财务记账，不含姓名与照片）
完成时间：2026-04-20 18:30
如需保留一份离线文件自行保存，请在 7 天内告知，过期后无法恢复。
```

**例外**：监护权争议时，先下线、不删除，等双方书面一致（见 X-07）。

### 18.4 导出与移交

- 客户申请离线包：打包 `public/orders/{slug}/` + 一个 `index.html`（静态快照），zip 交付，链接 7 天有效
- 不做「可编辑源文件」移交（客户拿去改会破坏设计）
- 导出不算二次收费，但一年限一次

### 18.5 备份与恢复

- 每日 03:00：`content/` + `prisma/dev.db` → `backup/YYYY-MM-DD.tar.gz` → COS
- 每月 1 日做一次恢复演练：随机取一个归档包，解到临时目录，起服务，能打开即算通过
- 恢复步骤：停服务 → 解包覆盖 → `pnpm prisma migrate deploy` → 起服务 → 抽查 3 个 slug

### 18.6 跨境访问

- 服务器在国内，海外访问会慢但可用；不因此改用海外节点（数据出境合规更麻烦）
- 页面上不主动暴露服务器位置；若海外亲友反馈慢，建议「用 Wi-Fi 或稍后再试」
- 不在页面上加载任何境外资源（字体、统计、CDN），避免被墙导致整页卡住

---

## 19. 附录

### 19.1 环境变量（`.env.example`）

```bash
# 站点
SITE_URL=https://memorial.example.com
NEXT_PUBLIC_SITE_NAME=一周岁

# 安全（缺失任一则启动失败）
AUTH_SECRET=            # 32 字节随机串，openssl rand -hex 32
ADMIN_PASSWORD=         # 后台密码
PREVIEW_SECRET=         # 预览链接签名

# 路径
CONTENT_DIR=./content/orders
PUBLIC_DIR=./public/orders

# 可选
ARCHIVE_DIR=./archive
MAX_ORDER_MB=500
```

### 19.2 常用命令

```bash
pnpm dev                          # 本地开发
pnpm build && pnpm start          # 生产
pnpm assets --slug=bb-20250417    # 处理原图
pnpm qr --slug=bb-20250417        # 生成二维码
pnpm archive --slug=bb-20250417   # 归档
pnpm budget                       # 输出包体积与图片体积报告
```

### 19.3 部署（腾讯云轻量 2C2G）

```bash
# 服务器
git clone <repo> /srv/yizhouji && cd /srv/yizhouji
pnpm i --frozen-lockfile && pnpm build
pm2 start "pnpm start" --name yizhouji

# Nginx（关键段）
server {
  listen 443 ssl http2;
  server_name memorial.example.com;
  location /s/ {
    add_header Cache-Control "private, no-store";
    add_header X-Robots-Tag "noindex, nofollow";
    proxy_pass http://127.0.0.1:3000;
  }
  location /_next/static/ { expires 1y; add_header Cache-Control "public, immutable"; }
  location /orders/ { expires 30d; add_header Cache-Control "public"; }
  location / { proxy_pass http://127.0.0.1:3000; }
}
```

- 备案域名必需（微信内访问）
- 静态资源建议上 COS + CDN，`/orders/` 走 CDN 回源
- 每日 03:00 备份：`content/` + `prisma/dev.db` 打包到 COS
- 每日 04:00 跑 `archive`：过 `expiresAt` 的订单打包并下线
- 没有印刷队列、没有物流、没有打样——v1 的运维只有「备份 + 归档」两条定时任务

### 19.4 素材收集清单（直接发客户）

```
【宝宝一周岁纪念 · 素材清单】

1. 宝宝小名、出生日期（精确到日）
2. 十二张月度照：第 1 个月到第 12 个月，每月一张，手机原图
3. 二十到三十张精选：满月、第一次翻身、第一次走路、全家福……
4. 身高体重：出生、3/6/9/12 个月（有几张填几张）
5. 三段话：
   · 想对孩子说的（50–300 字，就是那封信）
   · 想对伴侣说的（可选，会放进展厅）
   · 想对一年前的自己说的（可选）
6. 一首歌：从我们的曲库选，或提供歌名
7. 亲友祝福：最多 12 条，注明称呼（外婆、二舅……）
8. 风格：暖纸 / 胶片 / 极简白（会发三个样张给你选）

【请注意】
· 原图直接发，不要用微信「压缩」，不要加滤镜
· 涉及其他小朋友的照片，请先征得对方家长同意
· 所有素材仅用于制作，交付后 24 个月归档，可随时要求删除
```

### 19.5 默认文案库（`lib/copy.ts` 节选）

```ts
export const ZHUAZHOU_DEFAULT = [
  { key: "brush",  emoji: "🖌️", label: "画笔",   meaning: "以后大概会很喜欢涂涂画画。", fortune: "抓到了画笔" },
  { key: "book",   emoji: "📖", label: "书",     meaning: "是个坐得住、爱看书的小朋友。", fortune: "抓到了书" },
  { key: "abacus", emoji: "🧮", label: "算盘",   meaning: "对数字敏感，将来会算账。", fortune: "抓到了算盘" },
  { key: "money",  emoji: "💰", label: "钱袋",   meaning: "一辈子不缺钱花。", fortune: "抓到了钱袋" },
  { key: "seal",   emoji: "🎖️", label: "印章",   meaning: "将来是要做主的人。", fortune: "抓到了印章" },
  { key: "doctor", emoji: "🩺", label: "听诊器", meaning: "心细，会照顾人。", fortune: "抓到了听诊器" },
];

export const SECTION_TITLES = {
  timeline12: { index: "01", title: "十二个月", subtitle: "每一个月，都不一样" },
  growth:     { index: "02", title: "长大这件事", subtitle: "" },
  zhuazhou:   { index: "03", title: "抓周",      subtitle: "点一个，看看他抓到了什么" },
  gallery:    { index: "04", title: "还有一些瞬间" },
  letter:     { index: "05", title: "写给你的第一封信" },
  futureLetter:{ index: "06", title: "给未来的一封信" },
  guestbook:  { index: "07", title: "他们想对你说" },
} as const;
```

### 19.6 给 Trae 的提示词模板

> 用法：每次只贴一条，等它跑完检查点再贴下一条。斜体部分是变量。

**模板 1 · 脚手架**

```
读 DEV_SPEC.md 的第 4 章与第 8.2、8.4 节。
在本仓库初始化 Next.js 15 + TS + Tailwind 3.4 项目，实现：
1. app/layout.tsx：<html lang="zh-CN" data-theme="paper-warm">
2. app/themes.css：三套主题的全部 CSS 变量（值见 4.3）
3. tailwind.config.ts：把变量映射为 bg/surface/ink/ink-2/ink-3/line/accent/gold 语义类
4. app/page.tsx：临时页，三个按钮切换 data-theme，用来目检配色
约束：不引入任何 UI 库；不写死颜色；pnpm build 必须通过。
```

**模板 2 · 数据层**

```
读 DEV_SPEC.md 第 7 章。
实现 lib/types.ts、lib/schema.ts（完整复制 7.3 的 Zod 定义）、lib/story.ts。
loadStory(slug) 需完成：读文件 → Zod 校验 → normalize（排序/补位/去重/未解锁正文置空）。
同时创建 content/orders/bb-20250417/story.json，内容用 7.4 的示例。
再写 lib/schema.test.ts 四个用例：合法通过 / 缺字段 / unlockAt 早于生日 / 正文超长。
```

**模板 3 · 单个章节组件**

```
读 DEV_SPEC.md 第 6.2 节（十二个月）。
实现 components/sections/Timeline12.tsx：
- Props: { data: Timeline12Section }
- 严格按 6.2 的结构与视觉规格；只用 tailwind 语义类
- 月份缺失时渲染虚线占位卡（见「边界」）
- 动画：每个 item 进入视口 y24→0 + 淡入，once
- 图片统一用 components/ui/SmartImage.tsx（先用简单实现占位，PR6 再替换）
禁止：硬编码中文（文案全部来自 data）、引入图表库。
```

**模板 4 · 访问控制**

```
读 DEV_SPEC.md 第 8.8 节。
实现 lib/auth.ts（HMAC 签名/验签/timingSafeEqual）、middleware.ts、app/api/unlock/route.ts、app/gate/[slug]/page.tsx。
要求：连续 5 次错误锁 60 秒；密码页不渲染任何照片；
Cookie: m_pass_{slug}，httpOnly、secure、sameSite=lax、7 天。
写完用 playwright 跑 E1–E3（见 13.2），把测试放到 tests/auth.spec.ts。
```

**模板 5 · 后台**

```
读 DEV_SPEC.md 第 9 章。
实现 /admin/login、/admin/orders、/admin/orders/new、/admin/orders/[slug]（4 个 tab）。
数据用 Prisma + SQLite（schema 见 9.2）。
建单接口必须同时创建 content/orders/{slug}/ 与一份带默认值的 story.json。
状态按钮严格按 2.2 的迁移表渲染，非法迁移置灰并显示原因。
```

**模板 6 · 打磨与上线**

```
读 DEV_SPEC.md 第 11、12、14.3 节。
按顺序做四件事，每件单独提交：
1. 性能：接入 scripts/budget.ts，输出 JS/CSS/图片体积；把超过预算的项列出来并修到预算内。
2. 兼容：按 11.2 的「已知坑与对策」逐条检查，修 100dvh、长按菜单、X5 aspect-ratio 三处。
3. 归档：实现 scripts/archive.ts，把过 expiresAt 的订单打包成 archive/{slug}-{date}.tar.gz 并从 public 删除。
4. 测试：补齐 13.2 的 E1–E16。
验收：pnpm e2e 全绿；13.3 人工清单逐条打勾；第 15 章 P0 场景全部覆盖；正式域名能交付。
禁止：为印刷做任何准备（见第 10 章）。
```

**模板 7 · 场景补漏**

```
读 DEV_SPEC.md 第 15 章，只看 P0 的 36 条。
对照当前代码，逐条判断「已实现 / 部分实现 / 未实现」，
输出一张表（编号 / 状态 / 缺什么 / 建议改哪个文件）。
先不要改代码，等我确认优先级。
```

### 19.7 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-11-10 | 首版；9 章节、三主题、SSR + 密码门、24P 印刷 |
| v1.1 | 2026-11-10 | **范围收窄为纯电子版**：删除印刷章节、print 路由与 PDF 脚本；PR 由 10 个减为 9 个、排期由 14 天减为 12 天；档位改为 basic/plus |
| v1.2 | 2026-11-10 | 新增第 15–18 章：**93 个场景清单**（P0 37）、应急手册 9 条、内容边界与敏感场景、数据生命周期；补 2.3 异常分支与 E11–E16 测试 |

---

**最后一句话**：这份文档的每一处「为什么」都比「怎么做」重要。如果实现时发现某条规格与现实冲突，先改文档，再改代码——不要反过来。
