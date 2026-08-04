import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createServerFn } from "@tanstack/react-start";

export type Lang = "en" | "zh" | "yue";

type Dict = Record<string, string | string[] | Record<string, string>>;

export const translations: Record<Lang, Dict> = {
  en: {
    nav_why: "Why linQ",
    nav_how: "How it works",
    nav_moments: "Match mechanics",
    nav_compare: "Compare",
    nav_trust: "Trust",
    nav_support: "24/7 Support",
    nav_getStarted: "Get Started",
    hero_badge: "Shenzhen · Hong Kong ｜ AI matchmaking for real dates",
    hero_claude: "Every Wednesday,",
    hero_connections: "a real date, arranged.",
    hero_for: "No swiping · No small talk · ",
    hero_work: "",
    hero_love: "No flakes",
    hero_life: "",
    hero_desc:
      "Chat with AI for 5 minutes — it learns the real you.\nEvery Wednesday 7pm: one curated match, one booked restaurant. You just show up.",
    hero_joinNow: "Join now",
    hero_secondary: "Dating first · Business & local friends open later",
    weekly_kicker: "Every Wednesday",
    weekly_title1: "Get a date",
    weekly_title2: "every week.",
    weekly_desc:
      "One curated match, one ready-to-go plan: time, a real restaurant, ice-breakers. Delivered every Wednesday at 7pm — in Shenzhen or Hong Kong, with someone you'll actually want to meet.",
    weekly_days: "days",
    weekly_hrs: "hrs",
    weekly_min: "min",
    weekly_sec: "sec",
    weekly_next: "Next Match Day:",
    weekly_joined: "Cadence:",
    weekly_joined_value: "One match · every Wednesday",
    send_badge: "Chat 5 minutes with AI. We handle the rest.",
    send_title1: "Send the real you",
    send_title2: "to your match.",
    send_desc:
      "No curated bio. No filtered selfies. Claude packages the honest signals — how you think, what you care about, how you actually show up — and delivers them to the person on the other side.",
    send_cta: "Send Real You to Match",
    send_terms: "By continuing, you agree to our Terms & Privacy.",
    values_kicker: "Why linQ",
    values_title: "A new kind of matching, built on real behavior.",
    how_kicker: "How it works",
    how_title: "From sign-up to sitting across the table.",
    compare_kicker: "Compare",
    compare_title: "Why linQ beats traditional matching.",
    compare_col_trad: "Traditional platforms",
    compare_col_linq: "linQ",
    trust_kicker: "Trust & Compliance",
    trust_title: "Privacy is the product.",
    cta_start: "Start",
    cta_matching: "matching",
    cta_real: "For real this time.",
    cta_btn: "Start Matching",
    moments_kicker: "Match mechanics",
    moments_title1: "Every match,",
    moments_title2: "explained.",
    moments_desc:
      "Every match ships with an explainable reason: resonance, friction, and why now. Sample engine output below — illustrative, not real users.",
    footer_bubble: "An AI friend that texts you a ready-to-go date every Wednesday.",
    footer_tag: "The AI matchmaking platform for Shenzhen & Hong Kong. A real date, every Wednesday.",
    footer_product: "Product",
    footer_resources: "Resources",
    footer_support: "Support",
    footer_careers: "Careers",
    footer_manifesto: "Manifesto",
    footer_restaurants: "For restaurants",
    footer_press: "Press kit",
    footer_blog: "Blog",
    footer_chat: "24/7 Live chat",
    footer_trust: "Trust & safety",
    footer_help: "Help center",
    footer_news_title: "Get matched, not marketed at.",
    footer_news_desc: "One short note a month. No spam. Unsubscribe anytime.",
    footer_news_placeholder: "you@somewhere.com",
    footer_news_join: "Join",
    footer_copy: "linQ Labs Inc. · Made for real connections.",
    footer_terms: "Terms",
    footer_privacy: "Privacy",
    footer_cookies: "Cookies",
    footer_dpa: "DPA",
  },
  zh: {
    nav_why: "为什么选 linQ",
    nav_how: "​经营模式",
    nav_moments: "匹配机制",
    nav_compare: "产品定位",
    nav_trust: "信任",
    nav_support: "7×24 客服",
    nav_getStarted: "开始使用",
    hero_badge: "深圳 · 香港 ｜ AI 婚恋匹配",
    hero_claude: "每周三，",
    hero_connections: "约一场真实见面",
    hero_for: "不滑动 · 不尬聊 · ",
    hero_work: "",
    hero_love: "不放鸽子",
    hero_life: "",
    hero_desc:
      "跟 AI 聊 5 分钟，它读懂真实的你。\n每周三晚 7 点，为你匹配一个人、订好一家真实餐厅 —— 你只管赴约。",
    hero_joinNow: "立即加入",
    hero_secondary: "婚恋先行 · 商务合作与本地伙伴场景即将开放",
    weekly_kicker: "每周三",
    weekly_title1: "每周一约",
    weekly_title2: "从不缺席。",
    weekly_desc:
      "一次精心匹配，一份现成方案：时间、真实餐厅、破冰话题。每周三晚 7 点准时送达 —— 在深圳或香港，与你真正想见的人。",
    weekly_days: "天",
    weekly_hrs: "时",
    weekly_min: "分",
    weekly_sec: "秒",
    weekly_next: "下次匹配日：",
    weekly_joined: "节奏：",
    weekly_joined_value: "一次匹配 · 每个周三",
    send_badge: "跟 AI 聊 5 分钟，其余交给我们。",
    send_title1: "把真实的你",
    send_title2: "发送给对方。",
    send_desc:
      "不需要精心包装的简介，不需要滤镜照片。Claude大模型会把你最真实的信号 —— 你的思考方式、关心的事、真实状态 —— 打包传递给另一边的人。",
    send_cta: "把真实的我发送给匹配对象",
    send_terms: "继续即表示同意我们的条款与隐私政策。",
    values_kicker: "为什么选 linQ",
    values_title: "基于真实行为的全新匹配方式。",
    how_kicker: "​经营模式",
    how_title: "从注册到面对面只差一步。",
    compare_kicker: "产品定位",
    compare_title: "为何 linQ 超越传统匹配。",
    compare_col_trad: "传统平台",
    compare_col_linq: "linQ",
    trust_kicker: "信任与合规",
    trust_title: "隐私就是产品本身。",
    cta_start: "开启",
    cta_matching: "匹配",
    cta_real: "这一次，来真的。",
    cta_btn: "开始匹配",
    moments_kicker: "匹配机制",
    moments_title1: "每次匹配，",
    moments_title2: "都有理由。",
    moments_desc:
      "每次匹配都附带可解释的推荐理由：共鸣点、摩擦点、为什么是现在。以下为机制示例输出（示例，非真实用户）。",
    footer_bubble: "一位 AI 朋友，每周三直接把现成的约会推送给你。",
    footer_tag: "深圳与香港的 AI 婚恋匹配平台。每周三，约一场真实见面。",
    footer_product: "产品",
    footer_resources: "资源",
    footer_support: "支持",
    footer_careers: "招聘",
    footer_manifesto: "理念",
    footer_restaurants: "餐厅合作",
    footer_press: "媒体资料",
    footer_blog: "博客",
    footer_chat: "7×24 在线客服",
    footer_trust: "信任与安全",
    footer_help: "帮助中心",
    footer_news_title: "我们只匹配,不打广告。",
    footer_news_desc: "每月一封简短邮件。无垃圾信息，随时退订。",
    footer_news_placeholder: "you@somewhere.com",
    footer_news_join: "加入",
    footer_copy: "linQ Labs Inc. · 为真实的连接而生。",
    footer_terms: "条款",
    footer_privacy: "隐私",
    footer_cookies: "Cookies",
    footer_dpa: "数据协议",
  },
  // 粵語（香港）— 繁體 + 口语（嘅／係／唔／喺／咩／嘢／嗰／咗／嚟／俾／睇／搞掂／傾偈／唔該）
  yue: {
    nav_why: "點解揀 linQ",
    nav_how: "點運作",
    nav_moments: "配對機制",
    nav_compare: "同其他比較",
    nav_trust: "信任",
    nav_support: "7×24 客服",
    nav_getStarted: "即刻開始",
    hero_badge: "深圳 · 香港 ｜ AI 婚戀配對",
    hero_claude: "每個禮拜三，",
    hero_connections: "約一場真實見面",
    hero_for: "唔使 swipe · 唔使尬聊 · ",
    hero_work: "",
    hero_love: "唔會放飛機",
    hero_life: "",
    hero_desc:
      "同 AI 傾 5 分鐘，佢會讀懂最真實嘅你。\n每個禮拜三晚 7 點，為你配對一個人、訂好一間真實餐廳 —— 你負責赴約。",
    hero_joinNow: "即刻加入",
    hero_secondary: "婚戀先行 · 商務合作同本地朋友場景即將開放",
    weekly_kicker: "每個禮拜三",
    weekly_title1: "每星期",
    weekly_title2: "一次約會。",
    weekly_desc:
      "一個精選配對，一份現成方案：時間、真實餐廳、破冰話題。每個禮拜三晚 7 點準時送到 —— 喺深圳或香港，同你真正想見嘅人。",
    weekly_days: "日",
    weekly_hrs: "時",
    weekly_min: "分",
    weekly_sec: "秒",
    weekly_next: "下次配對日：",
    weekly_joined: "節奏：",
    weekly_joined_value: "一次配對 · 每個禮拜三",
    send_badge: "同 AI 傾 5 分鐘，其餘交俾我哋。",
    send_title1: "將最真實嘅你",
    send_title2: "傳俾你嘅配對。",
    send_desc:
      "唔使精心包裝嘅自介，唔使濾鏡相。Claude 模型會將你最真實嘅信號 —— 你嘅諗法、關心嘅嘢、真實狀態 —— 打包傳俾另一邊嘅人。",
    send_cta: "將真實嘅我傳俾配對對象",
    send_terms: "繼續即表示同意我哋嘅條款同私隱政策。",
    values_kicker: "點解揀 linQ",
    values_title: "一種建基於真實行為嘅全新配對方式。",
    how_kicker: "點運作",
    how_title: "由註冊到面對面，只差一步。",
    compare_kicker: "比較",
    compare_title: "點解 linQ 贏過傳統配對。",
    compare_col_trad: "傳統平台",
    compare_col_linq: "linQ",
    trust_kicker: "信任同合規",
    trust_title: "私隱就係產品本身。",
    cta_start: "開始",
    cta_matching: "配對",
    cta_real: "今次，嚟真嘅。",
    cta_btn: "即刻配對",
    moments_kicker: "配對機制",
    moments_title1: "每次配對，",
    moments_title2: "都有原因。",
    moments_desc:
      "每次配對都附有可以解釋嘅推薦理由：共鳴點、摩擦點、點解係依家。以下係機制示例輸出（示例，唔係真實用戶）。",
    footer_bubble: "一位 AI 朋友，每個禮拜三直接將現成嘅約會推送俾你。",
    footer_tag: "深圳同香港嘅 AI 婚戀配對平台。每個禮拜三，約一場真實見面。",
    footer_product: "產品",
    footer_resources: "資源",
    footer_support: "支援",
    footer_careers: "招聘",
    footer_manifesto: "理念",
    footer_restaurants: "餐廳合作",
    footer_press: "媒體資料",
    footer_blog: "網誌",
    footer_chat: "7×24 網上客服",
    footer_trust: "信任同安全",
    footer_help: "幫助中心",
    footer_news_title: "我哋只配對，唔打廣告。",
    footer_news_desc: "每月一封簡短電郵。冇垃圾訊息，隨時退訂。",
    footer_news_placeholder: "you@somewhere.com",
    footer_news_join: "加入",
    footer_copy: "linQ Labs Inc. · 為真實嘅連繫而生。",
    footer_terms: "條款",
    footer_privacy: "私隱",
    footer_cookies: "Cookies",
    footer_dpa: "數據協議",
  },
};

export const valuesI18n = {
  en: [
    {
      title: "A profile built by talking",
      body: "No forms, no tags. Chat with AI for 5 minutes — it learns who you really are from how you express yourself, not how you package yourself.",
    },
    {
      title: "Launching in Shenzhen & Hong Kong",
      body: "First phase opens in Shenzhen and Hong Kong only: real users, real restaurants, real meet-ups. Business and local-friend scenarios open later.",
    },
    {
      title: "AI meeting co-pilot",
      body: "From match to meet-up — linQ plans the time, the restaurant, and the ice-breakers. No awkward chats, no flakes, just real-world results.",
    },
  ],
  zh: [
    {
      title: "聊出来的 AI 档案",
      body: "不用填表，不用贴标签。跟 AI 聊 5 分钟，它从你的表达里读懂你真正是谁 —— 而不是你如何包装自己。",
    },
    {
      title: "深圳 · 香港 双城启动",
      body: "首期只开放深圳和香港：真实用户、真实餐厅、真实见面。商务合作与本地伙伴场景将随后开放。",
    },
    {
      title: "AI保驾护航",
      body: "从匹配到见面 —— linQ 规划好时间、餐厅和破冰话题。不尬聊，不放鸽子，只有真实的见面。",
    },
  ],
  yue: [
    {
      title: "傾出嚟嘅 AI 檔案",
      body: "唔使填表，唔使貼標籤。同 AI 傾 5 分鐘，佢會由你嘅表達入面，知道你真正係邊個 —— 而唔係你點包裝自己。",
    },
    {
      title: "深圳 · 香港 雙城啟動",
      body: "首期只開放深圳同香港：真實用戶、真實餐廳、真實見面。商務合作同本地朋友場景會隨後開放。",
    },
    {
      title: "AI 幫你搞掂約會",
      body: "由配對到見面 —— linQ 幫你規劃好時間、餐廳同破冰話題。唔使再尷尬寒暄，唔會再放飛機，只有真實嘅結果。",
    },
  ],
};

export const stepsI18n = {
  en: [
    {
      n: "01",
      title: "Sign up & authorize",
      body: "Register and grant scenario-level permissions. Privacy stays in your control from day one.",
    },
    {
      n: "02",
      title: "Chat 5 minutes with AI",
      body: "One conversation captures how you think, what you care about, and how you actually show up — that's your profile.",
    },
    {
      n: "03",
      title: "Matched every Wednesday",
      body: "Every Wednesday 7pm, AI picks your highest-fit person — with the reasoning attached.",
    },
    {
      n: "04",
      title: "Just show up",
      body: "Time, a real restaurant, ice-breakers — all arranged. You show up; linQ handles the rest.",
    },
  ],
  zh: [
    { n: "01", title: "注册与授权", body: "注册并按场景授予权限。隐私从第一天起就在你掌控中。" },
    {
      n: "02",
      title: "跟 AI 聊 5 分钟",
      body: "一次对话，AI 捕捉你的思考方式、在意的事和真实的状态 —— 这就是你的档案。",
    },
    {
      n: "03",
      title: "每周三匹配",
      body: "每周三晚 7 点，AI 为你选出最契合的一个人，并附上推荐理由。",
    },
    {
      n: "04",
      title: "赴约，方案已备好",
      body: "时间、真实餐厅、破冰话题都已安排好。你只管出现，其余交给 linQ。",
    },
  ],
  yue: [
    {
      n: "01",
      title: "註冊同授權",
      body: "註冊並按場景俾返相應權限。喺第一日開始，私隱就由你話事。",
    },
    {
      n: "02",
      title: "同 AI 傾 5 分鐘",
      body: "一次對話，AI 捕捉你嘅諗法、在意嘅嘢同真實狀態 —— 呢個就係你嘅檔案。",
    },
    {
      n: "03",
      title: "每個禮拜三配對",
      body: "每個禮拜三晚 7 點，AI 為你揀出最夾嘅一個人，並附上推薦理由。",
    },
    {
      n: "04",
      title: "赴約，方案已備好",
      body: "時間、真實餐廳、破冰話題都安排晒。你負責出現，其他嘢由 linQ 搞掂。",
    },
  ],
};

export const compareRowsI18n = {
  en: [
    [
      "Profile building",
      "Tinder / Hinge — endless swiping & curated personas",
      "Effortless Claude-powered behavioral profile",
    ],
    [
      "Authenticity",
      "RedNote · Coffee Chat — performative posts & filtered selves",
      "Honest signals from how you actually behave",
    ],
    [
      "Onboarding",
      "RedNote / WeChat — fill bio, tags, MBTI, hobbies, photos, voice intro…",
      "Zero forms. Claude reads your real behavior.",
    ],
    [
      "Getting a reply",
      "WeChat — add friend, wait for accept, send 50 messages, maybe meet",
      "One tap. AI sends a ready-to-go invite to both sides.",
    ],
    [
      "Scenarios",
      "Siloed apps: LinkedIn for work, Hinge for love, Meetup for friends",
      "Dating done right first — business & local open later",
    ],
    [
      "Effort to meet",
      "Match, then 100+ messages of small talk",
      "AI plans the meet-up. Just show up.",
    ],
    ["Outcome", "Ghosting, flakes, and dead chats", "Real-world dates, deals, and friendships"],
  ],
  zh: [
    ["档案构建", "Tinder / Hinge —— 无尽滑动与精心包装的人设", "由 Claude大模型驱动的零负担档案"],
    ["真实度", "小红书 · Coffee Chat —— 表演式贴文与过滤后的自己", "源自你真实行为的诚实信号"],
    [
      "入门",
      "社交媒体 —— 简介、标签、MBTI、兴趣、照片、语音…",
      "零提交信息，Claude大模型读懂你的真实行为。",
    ],
    [
      "获得回复",
      "微信 —— 加好友、等通过、发 50 条消息，或许能见面",
      "一键即达，AI 把现成的邀请同时送达双方。",
    ],
    [
      "场景",
      "孤岛 App：LinkedIn 谈事业、Hinge 谈恋爱、Meetup 找朋友",
      "先把婚恋这一件事做好，商务与本地随后开放",
    ],
    ["见面成本", "匹配后还要寒暄 100+ 条消息", "AI 规划好见面，你只管赴约。"],
    ["结果", "已读不回、放鸽子、聊死的对话", "真实的约会、生意与友谊"],
  ],
  yue: [
    [
      "檔案建立",
      "Tinder / Hinge —— 停唔到嘅 swipe 同精心包裝嘅人設",
      "由 Claude 模型驅動嘅零負擔檔案",
    ],
    ["真實度", "小紅書 · Coffee Chat —— 表演式嘅帖文同濾鏡後嘅自己", "源自你真實行為嘅誠實信號"],
    [
      "入門",
      "社交媒體 —— 自介、tag、MBTI、興趣、相、語音…",
      "乜都唔使填，Claude 模型讀得明你真實嘅行為。",
    ],
    [
      "收到回覆",
      "WhatsApp / WeChat —— 加好友、等通過、send 50 個 message，可能先見到面",
      "一撳搞掂，AI 即刻將現成嘅邀請送俾雙方。",
    ],
    [
      "場景",
      "散晒嘅 App：LinkedIn 做嘢、Hinge 拍拖、Meetup 識朋友",
      "先將婚戀呢一件事做好，商務同本地隨後開放",
    ],
    ["見面成本", "配對完仲要 send 100+ 個 message 吹水", "AI 幫你規劃好晒見面，你負責赴約。"],
    ["結果", "已讀不回、放飛機、吹死死嘅對話", "真實嘅約會、生意同友誼"],
  ],
};

export const trustI18n = {
  en: [
    {
      title: "Three-tier privacy",
      body: "Granular authorization with physically isolated data layers across scenarios.",
    },
    {
      title: "No data misuse",
      body: "Nothing is sold. Nothing is force-collected. Compliance is the floor, not the goal.",
    },
    {
      title: "Explainable AI",
      body: "Every match comes with reasoning. Fair, auditable, and accountable by design.",
    },
  ],
  zh: [
    { title: "三层隐私管理", body: "细粒度授权，跨场景的数据层在物理上彼此隔离。" },
    { title: "拒绝数据滥用", body: "绝不出售，绝不强制收集。合规是底线，不是目标。" },
    { title: "监管下的深度AI", body: "每一次匹配都有理由可循。公平、可审计、有责可究。" },
  ],
  yue: [
    { title: "三層私隱管理", body: "細緻嘅授權，唔同場景嘅數據層喺物理上完全隔離。" },
    {
      title: "拒絕濫用數據",
      body: "絕對唔會出售，絕對唔會強制收集。合規只係最基本嘅要求，唔係目標。",
    },
    { title: "可解釋嘅 AI", body: "每次配對都會有原因。公平、可以審查、有問責嘅設計。" },
  ],
};

export const momentsI18n = {
  en: [
    {
      tag: "Sample · Shenzhen Nanshan",
      score: "0.87",
      name: "Resonance 0.87 · Friction 0.31",
      quote:
        "Both reset with weekend hikes. Different timelines on settling down — a first-date conversation, not a dealbreaker.",
    },
    {
      tag: "Sample · Hong Kong Central",
      score: "0.82",
      name: "Resonance 0.82 · Friction 0.24",
      quote:
        "Rank 'a stable relationship' almost identically. Early bird vs night owl — already written into the ice-breakers.",
    },
    {
      tag: "Sample · Shenzhen Futian",
      score: "0.79",
      name: "Resonance 0.79 · Friction 0.18",
      quote:
        "Both moved from internet to hardware within a year. Aligned on money, complementary on travel.",
    },
    {
      tag: "Sample · Tsim Sha Tsui",
      score: "0.85",
      name: "Resonance 0.85 · Friction 0.29",
      quote:
        "Family values and career plans in sync. Planner meets spontaneous — the itinerary meets in the middle.",
    },
    {
      tag: "Sample · Shenzhen Qianhai",
      score: "0.91",
      name: "Resonance 0.91 · Friction 0.22",
      quote:
        "Both rank 'sincerity' as the first principle. One texts fast, one slow — AI suggests starting in writing.",
    },
    {
      tag: "Sample · SZ ⇄ HK cross-border",
      score: "0.77",
      name: "Resonance 0.77 · Friction 0.35",
      quote:
        "Both commute weekly; rhythms match. Distance is the unknown — so date one is planned near Shenzhen North.",
    },
  ],
  zh: [
    {
      tag: "示例 · 深圳 南山",
      score: "0.87",
      name: "共鸣 0.87 · 摩擦 0.31",
      quote: "都把「周末爬山」当作重启方式；在「定居城市」上节奏不同，值得第一次见面就聊开。",
    },
    {
      tag: "示例 · 香港 中环",
      score: "0.82",
      name: "共鸣 0.82 · 摩擦 0.24",
      quote: "对「稳定的亲密关系」的排序高度一致；一个早睡一个熬夜，作息差已写进破冰话题。",
    },
    {
      tag: "示例 · 深圳 福田",
      score: "0.79",
      name: "共鸣 0.79 · 摩擦 0.18",
      quote: "都在一年内从互联网转向硬件；消费观一致，旅行偏好互补。",
    },
    {
      tag: "示例 · 香港 尖沙咀",
      score: "0.85",
      name: "共鸣 0.85 · 摩擦 0.29",
      quote: "家庭观念与职业规划同频；一个爱计划一个随性，见面方案已按折中节奏设计。",
    },
    {
      tag: "示例 · 深圳 前海",
      score: "0.91",
      name: "共鸣 0.91 · 摩擦 0.22",
      quote: "都把「真诚」列为第一原则；沟通风格一快一慢，AI 建议从文字开始。",
    },
    {
      tag: "示例 · 跨境 深圳⇄香港",
      score: "0.77",
      name: "共鸣 0.77 · 摩擦 0.35",
      quote: "每周往返深港，生活节奏接近；最大的不确定性是距离，所以第一次见面选在了深圳北附近。",
    },
  ],
  yue: [
    {
      tag: "示例 · 深圳 南山",
      score: "0.87",
      name: "共鳴 0.87 · 摩擦 0.31",
      quote: "兩個都將「週末行山」當作重啟方式；喺「定居城市」上節奏唔同，值得第一次見面就傾開。",
    },
    {
      tag: "示例 · 香港 中環",
      score: "0.82",
      name: "共鳴 0.82 · 摩擦 0.24",
      quote: "對「穩定嘅親密關係」嘅排序高度一致；一個早瞓一個挨夜，作息差已寫入破冰話題。",
    },
    {
      tag: "示例 · 深圳 福田",
      score: "0.79",
      name: "共鳴 0.79 · 摩擦 0.18",
      quote: "都喺一年內由互聯網轉去硬件；消費觀一致，旅行偏好互補。",
    },
    {
      tag: "示例 · 香港 尖沙咀",
      score: "0.85",
      name: "共鳴 0.85 · 摩擦 0.29",
      quote: "家庭觀念同職業規劃同頻；一個鍾意計劃一個隨性，見面方案已按折中節奏設計。",
    },
    {
      tag: "示例 · 深圳 前海",
      score: "0.91",
      name: "共鳴 0.91 · 摩擦 0.22",
      quote: "都將「真誠」列為第一原則；溝通風格一快一慢，AI 建議由文字開始。",
    },
    {
      tag: "示例 · 跨境 深圳⇄香港",
      score: "0.77",
      name: "共鳴 0.77 · 摩擦 0.35",
      quote: "每星期往返深港，生活節奏接近；最大嘅唔確定性係距離，所以第一次見面揀咗深圳北附近。",
    },
  ],
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const LangContext = createContext<Ctx | null>(null);

/**
 * P2-deferred 3: pass initialLang from the SSR layer so <html lang>
 * matches on first paint. The provider still updates to the user's
 * localStorage choice in a useEffect, but the initial render is
 * already correct (no hydration mismatch warning, no 1s polling).
 *
 * When called from a server-rendered page, the caller can pass
 * request.headers.get("accept-language") parsed into a Lang.
 * When called from a client-only page, pass "en" and the effect
 * will upgrade it on mount.
 */
export function detectLangFromHeader(acceptLanguage: string | null | undefined): Lang {
  if (!acceptLanguage) return "en";
  // accept-language can be "zh-CN,zh;q=0.9,en;q=0.8" — we just
  // look for the first tag.
  const first = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("zh-hk") || first.startsWith("yue")) return "yue";
  if (first.startsWith("zh")) return "zh";
  return "en";
}

/**
 * SSR-only language detection. The handler body runs on the server and reads
 * the incoming request's Accept-Language header. Because the server-only
 * import is awaited inside the handler, it is tree-shaken from the client
 * bundle and avoids TanStack Start's import-protection error.
 */
export const getInitialLang = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req = getRequest();
  const acceptLanguage = req?.headers.get("accept-language") ?? null;
  return detectLangFromHeader(acceptLanguage);
});

export function LanguageProvider({
  children,
  initialLang = "en",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  useEffect(() => {
    if (typeof window === "undefined") return;
    // localStorage wins over the SSR initial (the user may have
    // explicitly chosen a different language).
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "en" || saved === "zh" || (saved === "yue" && saved !== initialLang)) {
      setLangState(saved);
      return;
    }
    // No localStorage choice — keep the SSR-detected lang.
  }, [initialLang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };
  const t = (k: string) => {
    const v = (translations[lang] as Record<string, string>)[k];
    return typeof v === "string" ? v : k;
  };
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
