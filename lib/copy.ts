/**
 * 默认文案库（DEV_SPEC 0.3 / 19.5）。
 * 组件里不允许出现中文字符串：所有面向用户的文字都来自 story.json 或这里。
 */

export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "一周岁",
  url: process.env.SITE_URL ?? "http://localhost:3000",
  defaultTitle: "一周岁 · 宝宝一周岁电子纪念册",
  description: "扫码就能看的一周岁纪念页：十二个月、成长、抓周、一封信。",
  contactEmail: "hello@yizhouji.example",
} as const;

export const LANDING = {
  eyebrow: "一周岁",
  title: "宝宝一周岁纪念页，扫码就能看。",
  description:
    "一个订单 = 一份 JSON + 一个目录 + 一条链接。九章纪念页、密码门、二维码与分享海报，48 小时内交付。",
  sampleLabel: "查看示例订单",
  sampleHint: "示例密码：0417",
  steps: ["十二个月", "成长曲线", "抓周", "爸爸妈妈的信", "给未来的一封信"],
  enterAdmin: "进入后台",
} as const;

export const GATE = {
  hint: "输入宝宝生日（4 位）",
  help: "问问发链接给你的人",
  error: "密码不对，问问发链接给你的人",
  locked: (seconds: number) => `稍后再试（${seconds} 秒）`,
  submitting: "正在进入…",
  archivedTitle: "这份纪念页已归档",
  archivedBody: "托管期已结束，页面不再对外展示。如需恢复或导出，请联系制作者。",
  contact: "联系邮箱",
} as const;

export const EXPIRED = {
  title: "这份纪念页已归档",
  body: "托管期已结束，页面已下线。原始素材与归档包会按约定保留，可联系制作者申请导出。",
  contact: "联系邮箱",
  backHome: "回到首页",
} as const;

export const SECTION_ANCHORS: Record<string, string> = {
  hero: "top",
  timeline12: "months",
  growth: "growth",
  zhuazhou: "zhuazhou",
  gallery: "gallery",
  letter: "letter",
  futureLetter: "future",
  guestbook: "bless",
  outro: "end",
};

export const SECTION_TITLES = {
  hero: { index: "", title: "", subtitle: "" },
  timeline12: { index: "01", title: "十二个月", subtitle: "每一个月，都不一样" },
  growth: { index: "02", title: "长大这件事", subtitle: "" },
  zhuazhou: { index: "03", title: "抓周", subtitle: "点一个，看看他抓到了什么" },
  gallery: { index: "04", title: "还有一些瞬间", subtitle: "" },
  letter: { index: "05", title: "写给你的第一封信", subtitle: "" },
  futureLetter: { index: "06", title: "给未来的一封信", subtitle: "" },
  guestbook: { index: "07", title: "他们想对你说", subtitle: "" },
  outro: { index: "08", title: "", subtitle: "" },
} as const;

export const HERO = {
  eyebrow: (year: number) => `${year} · 一周岁`,
  meta: (date: string, age: string) => `${date} · ${age}`,
  scrollLabel: "向下滚动",
  missingCover: "封面照片还在路上",
} as const;

export const TIMELINE = {
  placeholder: "这个月的照片还在路上",
  monthLabel: (month: number) => `${String(month).padStart(2, "0")}`,
} as const;

export const GROWTH = {
  height: "身高",
  weight: "体重",
  teeth: "乳牙",
  unit: { height: "cm", weight: "kg", teeth: "颗" },
  toggle: { height: "身高", weight: "体重" },
  chartLabel: "成长曲线",
  tooltip: (month: number, value: number, unit: string) => `${month} 个月 · ${value}${unit}`,
  firstsTitle: "第一次",
  empty: "还没有记录，等下一张体检单。",
} as const;

export const ZHUAZHOU_DEFAULT = [
  { key: "brush", label: "毛笔", meaning: "以后大概会很喜欢涂涂画画。", fortune: "抓到了毛笔" },
  { key: "book", label: "线装书", meaning: "是个坐得住、爱看书的小朋友。", fortune: "抓到了书" },
  { key: "abacus", label: "算盘", meaning: "对数字敏感，将来会算账。", fortune: "抓到了算盘" },
  { key: "seal", label: "印章", meaning: "将来是要做主的人。", fortune: "抓到了印章" },
  { key: "coin", label: "铜钱", meaning: "一辈子不缺钱花。", fortune: "抓到了铜钱" },
  { key: "stethoscope", label: "听诊器", meaning: "心细，会照顾人。", fortune: "抓到了听诊器" },
] as const;

export const ZHUAZHOU = {
  hint: "凭直觉点，别想太久",
  again: "再抓一次",
  save: "保存这张",
  saving: "正在生成…",
  saveFailed: "保存失败，截图也行",
  itemAria: (label: string) => `选择${label}`,
  seal: "周岁",
  sceneAria: "抓周：从六件物品中选一件",
  resultAria: (fortune: string) => `抓周结果：${fortune}`,
} as const;

export const GALLERY = {
  end: (count: number) => `— 一共 ${count} 张，都在这儿了 —`,
  itemAria: (index: number) => `查看第 ${index} 张照片`,
} as const;

export const LETTER = {
  to: (name: string) => `致 ${name}`,
  skip: "点击跳过打字动画",
  fallbackTitle: "写给你的第一封信",
  handwritingAlt: "手写签名",
} as const;

export const FUTURE = {
  lockLabel: (title: string) => title,
  countdown: (days: number) => `${days}`,
  countdownUnit: "天后开启",
  lockedHint: "这封信现在打不开，等他自己来读",
  longWait: "等他长大",
  openHint: "这封信已经可以读了",
  writtenBy: (from: string, writtenAt: string) => `${from} · ${writtenAt}`,
} as const;

export const GUESTBOOK = {
  expand: (count: number) => `展开全部（${count}）`,
  collapse: "收起",
  from: (from: string, relation?: string) => (relation ? `${from} · ${relation}` : from),
  listen: (from: string) => `听${from}说`,
  playing: (from: string) => `正在播放 · ${from}`,
  audioFailed: "这段语音暂时放不了",
} as const;

export const OUTRO = {
  sign: "— 谢谢你来看我 —",
  dateLine: (date: string) => `${date} — 一周岁`,
  savePoster: "保存分享图",
  share: "分享给家人",
  shareFallback: "链接已复制",
  qrHint: "扫码也能看",
  qrAlt: "纪念页二维码",
  footer: {
    family: "仅限家人查看",
    madeBy: "由「一周岁」制作",
    year: "2026",
  },
} as const;

export const LIGHTBOX = {
  close: "关闭",
  prev: "上一张",
  next: "下一张",
  counter: (current: number, total: number) => `${current} / ${total}`,
  ariaLabel: "照片查看",
} as const;

export const AUDIO = {
  play: "播放背景音乐",
  pause: "暂停背景音乐",
  unavailable: "背景音乐不可用",
} as const;

export const NAV = {
  label: "章节导航",
  jump: (title: string) => `跳到${title}`,
} as const;

export const PREVIEW = {
  badge: "预览版 · 未交付",
} as const;

/** PDF 传播版（DEV_SPEC 20.11） */
export const PDF = {
  defaultName: "宝宝",
  header: (name: string) => `${name} · 一周岁`,
  pageNum: (page: number) => `— ${String(page).padStart(2, "0")} —`,
  coverMeta: (date: string) => `${date} · 一周岁`,
  timelineTitle: (from: number, to: number) => `十二个月 · ${from}–${to}`,
  monthNote: (month: number) => `${month} 个月`,
  letterContinued: "写给你的第一封信 · 续",
  blessOverflow: (total: number) => `共 ${total} 条，全部见电子版`,
  futureEnvelope: "给未来的一封信",
  futureHint: "这一天再打开",
  madeBy: "由「一周岁」制作",
  contact: (email: string) => `联系我们：${email}`,
  pdfFile: (name: string, version?: number) =>
    version && version > 1 ? `${name}的一周岁_v${version}.pdf` : `${name}的一周岁.pdf`,
  htmlFile: (name: string, version?: number) =>
    version && version > 1 ? `${name}的一周岁_v${version}.html` : `${name}的一周岁.html`,
} as const;

/** 单文件离线包（DEV_SPEC 20.3 / 20.4 / 20.6） */
export const OFFLINE = {
  cover: "封面",
  ending: "结尾",
  navLabel: "章节导航",
  generatedAt: (date: string, version: number) => `生成于 ${date} · 第 ${version} 版`,
  contents: (items: string[]) => `包含：${items.join("、")}`,
  contact: (email: string) => `联系我们：${email}`,
  audioMissing: "音乐未包含",
  playMusic: "播放背景音乐",
  pauseMusic: "暂停背景音乐",
  futureOmitted: "正文不在这份文件里。等到那一天，再打开它。",
  futureHint: "这一天再打开",
  zhuazhouHint: "凭直觉点一个",
  zhuazhouAgain: "再抓一次",
  zhuazhouSeal: "周岁",
  voiceMissing: "语音祝福见电子版",
  signatureAlt: "手写签名",
  lightboxClose: "关闭",
  lightboxPrev: "上一张",
  lightboxNext: "下一张",
  heroMeta: (date: string) => `${date} · 一周岁`,
} as const;

export const POSTER = {
  hintMobile: "长按图片保存",
  hintDesktop: "已生成，正在下载",
  failed: "生成失败，截图保存也行",
  alt: "分享海报",
  close: "关闭",
} as const;

export const VALIDATION = {
  dateFormat: "日期必须是 YYYY-MM-DD",
  dateInvalid: "生日不是有效日期",
  babyName: "宝宝小名 1–8 个字",
  password: "密码必须是 4 位数字",
  slugExists: "slug 已存在",
  storyMissing: "story.json 不存在",
  storyInvalid: "story.json 无法解析",
  photoName: "只允许文件名，不允许路径",
  unlockAfterBirthday: "未来信解锁日期必须晚于生日",
  letterTooLong: "信件正文请控制在 800 字内",
  missingField: "缺少必填字段",
  schemaFailed: "story.json 校验失败",
  assetMissing: "引用的图片文件不存在",
  assetMissingSummary: (count: number) => `缺少 ${count} 个资源文件`,
  audioTooLarge: "音频请压缩到 3MB 内",
  coverMissing: "封面图缺失，不能生成预览",
  slugInvalid: "slug 只能是小写字母、数字与连字符，3–40 位",
  timelineFew: "十二个月还差几张，页面会显示占位卡",
  sectionsMostDisabled: "超过一半章节被关闭，页面会显得很空",
} as const;

export const COMMON = {
  loading: "加载中…",
  save: "保存",
  cancel: "取消",
  confirm: "确认",
  delete: "删除",
  copy: "复制",
  copied: "已复制",
  download: "下载",
  back: "返回",
  open: "打开",
  close: "关闭",
  required: "必填",
  optional: "可选",
} as const;

export const ADMIN = {
  brand: "一周岁 · 后台",
  login: {
    title: "后台登录",
    password: "后台密码",
    submit: "登录",
    submitting: "登录中…",
    error: "密码不对",
    locked: (seconds: number) => `尝试过多，${seconds} 秒后再试`,
    hint: "单用户后台，不做注册与找回。",
  },
  nav: {
    orders: "订单",
    newOrder: "新建订单",
    logout: "退出",
    site: "查看首页",
  },
  statusLabels: {
    draft: "草稿",
    paid: "已收定金",
    assets: "素材齐备",
    building: "制作中",
    review: "待确认",
    delivered: "已交付",
    archived: "已归档",
    paused: "暂停",
  },
  orders: {
    title: "订单",
    stats: { month: "本月订单", pending: "待制作", overdue: "逾期" },
    columns: {
      baby: "宝宝 / slug",
      status: "状态",
      birthday: "生日",
      countdown: "距生日",
      actions: "操作",
    },
    countdown: (days: number) => (days >= 0 ? `还有 ${days} 天` : `已过 ${Math.abs(days)} 天`),
    open: "打开",
    copyLink: "复制链接",
    archive: "归档",
    archiving: "归档中…",
    empty: "还没有订单，先建一单。",
    newOrder: "新建订单",
  },
  newOrder: {
    title: "新建订单",
    babyName: "宝宝小名",
    birthday: "生日（公历）",
    slug: "slug",
    slugHint: "默认 bb-YYYYMMDD，可改",
    theme: "主题",
    themeLabels: { "paper-warm": "暖纸", film: "胶片", minimal: "极简白" },
    password: "密码（4 位）",
    tier: "档位",
    tierLabels: { basic: "标准", plus: "尊享" },
    deposit: "定金（元）",
    submit: "建单",
    submitting: "建单中…",
    error: "建单失败",
  },
  detail: {
    tabs: { basic: "基本", assets: "素材", content: "内容", delivery: "交付" },
    basic: {
      title: "客户信息",
      contact: "联系方式",
      amount: "金额（元）",
      note: "备注",
      revisions: "修改轮次",
      revisionWarn: "已超过 2 轮修改，超出部分按 ¥30/页计费",
      statusTitle: "状态",
      save: "保存修改",
      saved: "已保存",
      invalidTransition: "这个状态不能直接跳过去",
      deliverBlocked: "素材未齐，不能交付",
      restoreFirst: "已归档的订单需要先恢复",
      pausedHint: "暂停不进排期，但会出现在待跟进列表里。",
    },
    assets: {
      title: "素材",
      upload: "上传素材",
      uploading: "上传中…",
      dragHint: "拖拽或多选文件，按用途顺序命名",
      purpose: "用途",
      purposes: { cover: "封面", monthly: "十二个月", gallery: "精选", bgm: "背景音乐" },
      month: "月份",
      monthOption: (month: number) => `第 ${month} 个月`,
      monthHint: "选择月份后上传，重复上传会替换该月照片",
      galleryHint: (filled: number, total: number) =>
        `已使用 ${filled}/${total} 个位置，还可以上传 ${Math.max(0, total - filled)} 张，超出会按顺序覆盖已有照片`,
      uploaded: (files: string) => `已上传：${files}`,
      monthOne: "每个月只能上传一张照片",
      monthInvalid: "请选择有效的月份",
      checklist: "完整性检查",
      preview: "缩略图",
      checks: { cover: "封面", months: "十二个月", gallery: "精选 30 张", bgm: "背景音乐" },
      present: "已就绪",
      missing: "缺失",
      noFiles: "没有选择文件",
      unsupported: "只支持图片与 mp3",
      slotFull: "该用途的槽位已满",
      overwritten: (keys: string) => `槽位已满，已按顺序覆盖：${keys}`,
      orderTooLarge: "订单素材目录超过 500MB，请先清理",
      audioWarning: "背景音乐超过 2.5MB，建议压缩",
      budgetWarning: "单页资源超过 3.5MB 预算",
      missingRaw: "缺少素材目录",
    },
    content: {
      title: "内容",
      quickTitle: "常用字段",
      name: "宝宝小名",
      tagline: "一句寄语",
      notes: "十二个月说明",
      letter: "信件正文",
      unlockAt: "未来信解锁日",
      json: "story.json",
      format: "格式化",
      validate: "校验",
      save: "保存内容",
      saved: "已保存",
      invalid: "校验未通过",
      valid: "校验通过",
      parseError: "JSON 无法解析",
    },
    delivery: {
      title: "交付",
      preview: "预览链接",
      official: "正式链接",
      qr: "二维码",
      qrDownload: "下载二维码",
      passwordReset: "重置密码",
      newPassword: "新密码（4 位）",
      reset: "重置",
      resetDone: "密码已重置",
      archive: "归档（打包并下线）",
      archiveConfirm: "归档后页面立即 410，确认？",
      archivePrompt: (slug: string) => `归档会打包并下线页面，输入 ${slug} 确认：`,
      archived: "已归档",
      archiveFailed: "归档打包失败",
      copy: "复制",
      notGenerated: "尚未生成",
      previewHint: "预览链接需要后台登录，客户打开时会看到密码页。",
      qrMissing: "还没有生成二维码，先点「检查并生成」。",
    },
    build: {
      title: "生成预览",
      action: "检查并生成",
      building: "生成中…",
      ok: "已生成",
      warn: "已生成（有提醒）",
      failed: "生成失败",
      copyPreview: "复制预览链接",
    },
  },
  errors: {
    unauthorized: "登录已失效，请重新登录",
    forbidden: "没有权限",
    notFound: "订单不存在",
    general: "操作失败",
  },
  defaults: {
    tagline: "谢谢你选中我们做你的爸爸妈妈",
    monthNote: (month: number) => `${month} 个月`,
    letterFrom: "妈妈",
    letterBody: "在这里写下你想对宝宝说的话。\n等他长大，再读给他听。",
    futureTitle: "给十八岁的你",
    futureBody: "写下这些话的时候，你还很小。等你读到它，应该已经长大了。",
    outroThanks: "谢谢你来看我",
    outroSignature: (name: string) => `${name} · 一周岁`,
    writtenSuffix: "写",
  },
} as const;

export const API_ERRORS = {
  UNAUTHORIZED: "登录已失效，请重新登录",
  FORBIDDEN: "没有权限",
  NOT_FOUND: "订单不存在",
  GONE: "已归档",
  BAD_PASSWORD: "密码不对",
  RATE_LIMITED: "稍后再试",
  SCHEMA_INVALID: "story.json 不合规",
  ASSET_MISSING: "资源缺失",
  AUDIO_TOO_LARGE: "音频超限",
  INTERNAL: "服务器错误",
} as const;

export const LOOKS = {
  none: "原样",
  warm: "暖纸",
  film: "胶片",
  mono: "黑白",
  soft: "柔光",
  punch: "高对比",
} as const;

export const LOOKS_SHEET = {
  title: "六种调色",
  defaultMark: "默认",
} as const;
