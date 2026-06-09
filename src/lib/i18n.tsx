import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "zh" | "yue";

type Dict = Record<string, string | string[] | Record<string, string>>;

export const translations: Record<Lang, Dict> = {
  en: {
    nav_why: "Why linQ",
    nav_how: "How it works",
    nav_moments: "Moments",
    nav_compare: "Compare",
    nav_trust: "Trust",
    nav_support: "24/7 Support",
    nav_getStarted: "Get Started",
    hero_badge: "The Claude-native matching platform",
    hero_claude: "Claude-powered",
    hero_connections: "connections",
    hero_for: "for",
    hero_work: "work",
    hero_love: "love",
    hero_life: "life",
    hero_desc: "Less effort, more meaningful links.\nBusiness partners, dating, local friends — one AI connection covers them all. No forms. No tags. Just the real you.",
    hero_joinNow: "Join now",
    weekly_kicker: "Every Wednesday",
    weekly_title1: "Get a date",
    weekly_title2: "every week.",
    weekly_desc: "One curated match. One ready-to-go plan. Delivered every Wednesday at 7pm — like a standing reservation with someone you'll actually want to meet.",
    weekly_days: "days",
    weekly_hrs: "hrs",
    weekly_min: "min",
    weekly_sec: "sec",
    weekly_next: "Next Match Day:",
    weekly_joined: "Cadence:",
    weekly_joined_value: "One match · every Wednesday",
    send_badge: "One tap. Zero forms.",
    send_title1: "Send the real you",
    send_title2: "to your match.",
    send_desc: "No curated bio. No filtered selfies. Claude packages the honest signals — how you think, what you care about, how you actually show up — and delivers them to the person on the other side.",
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
    moments_kicker: "Moments",
    moments_title1: "Unforgettable",
    moments_title2: "great times.",
    moments_desc: "Real people. Real meet-ups. Curated by Claude, lived by you.",
    footer_bubble: "A Claude-powered friend that texts you ready-to-go matches.",
    footer_tag: "The Claude-native matching platform for business, dating, and local life.",
    footer_product: "Product",
    footer_resources: "Resources",
    footer_support: "Support",
    footer_careers: "Careers",
    footer_manifesto: "Manifesto",
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
    nav_moments: "精彩瞬间",
    nav_compare: "产品定位",
    nav_trust: "信任",
    nav_support: "7×24 客服",
    nav_getStarted: "开始使用",
    hero_badge: "Claude大模型原生匹配平台",
    hero_claude: "Claude大模型",
    hero_connections: "​",
    hero_for: "一场真正的链接",
    hero_work: "​",
    hero_love: "​",
    hero_life: "​",
    hero_desc: "更少的负担，更有意义的连接。\n商业伙伴、约会、本地好友 —— 一个 AI 连接全部搞定。无需填表，无需贴标签，只展示真实的你。",
    hero_joinNow: "立即加入",
    weekly_kicker: "每周三",
    weekly_title1: "每周一约",
    weekly_title2: "从不缺席。",
    weekly_desc: "一次精心匹配。一份现成方案。每周三晚 7 点准时送达 —— 像一场长期预约，与你真正想见的人。",
    weekly_days: "天",
    weekly_hrs: "时",
    weekly_min: "分",
    weekly_sec: "秒",
    weekly_next: "下次匹配日：",
    weekly_joined: "节奏：",
    weekly_joined_value: "一次匹配 · 每个周三",
    send_badge: "一键直达，无需填表。",
    send_title1: "把真实的你",
    send_title2: "发送给对方。",
    send_desc: "不需要精心包装的简介，不需要滤镜照片。Claude大模型会把你最真实的信号 —— 你的思考方式、关心的事、真实状态 —— 打包传递给另一边的人。",
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
    moments_kicker: "精彩瞬间",
    moments_title1: "难忘的",
    moments_title2: "美好时光。",
    moments_desc: "真实的人，真实的相见。由 Claude大模型精心策划，由你亲身经历。",
    footer_bubble: "一位由 Claude大模型驱动的朋友，直接把现成的匹配推送给你。",
    footer_tag: "面向商业、约会与本地生活的 Claude大模型原生匹配平台。",
    footer_product: "产品",
    footer_resources: "资源",
    footer_support: "支持",
    footer_careers: "招聘",
    footer_manifesto: "理念",
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
    nav_moments: "精彩時刻",
    nav_compare: "同其他比較",
    nav_trust: "信任",
    nav_support: "7×24 客服",
    nav_getStarted: "即刻開始",
    hero_badge: "Claude 模型原生配對平台",
    hero_claude: "Claude 驅動",
    hero_connections: "連繫",
    hero_for: "為",
    hero_work: "工作",
    hero_love: "愛情",
    hero_life: "生活",
    hero_desc: "少啲負擔，多啲有意義嘅連繫。\n商業拍檔、拍拖、本地朋友 —— 一個 AI 連繫全部幫你搞掂。唔使填表，唔使貼標籤，俾最真實嘅你。",
    hero_joinNow: "即刻加入",
    weekly_kicker: "每個禮拜三",
    weekly_title1: "每星期",
    weekly_title2: "一次約會。",
    weekly_desc: "一個精選配對。一份現成方案。每個禮拜三晚 7 點準時送到 —— 似一場長期預約，同你真正想見嘅人。",
    weekly_days: "日",
    weekly_hrs: "時",
    weekly_min: "分",
    weekly_sec: "秒",
    weekly_next: "下次配對日：",
    weekly_joined: "節奏：",
    weekly_joined_value: "一次配對 · 每個禮拜三",
    send_badge: "一撳搞掂，唔使填表。",
    send_title1: "將最真實嘅你",
    send_title2: "傳俾你嘅配對。",
    send_desc: "唔使精心包裝嘅自介，唔使濾鏡相。Claude 模型會將你最真實嘅信號 —— 你嘅諗法、關心嘅嘢、真實狀態 —— 打包傳俾另一邊嘅人。",
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
    moments_kicker: "精彩時刻",
    moments_title1: "難忘嘅",
    moments_title2: "美好時光。",
    moments_desc: "真實嘅人，真實嘅相聚。由 Claude 模型精心策劃，由你親身經歷。",
    footer_bubble: "一位由 Claude 模型驅動嘅朋友，直接將現成嘅配對推送俾你。",
    footer_tag: "面向商業、約會同本地生活嘅 Claude 模型原生配對平台。",
    footer_product: "產品",
    footer_resources: "資源",
    footer_support: "支援",
    footer_careers: "招聘",
    footer_manifesto: "理念",
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
    { title: "Effortless AI profile", body: "No forms, no tags. AI quietly learns who you really are from the way you act — not the way you self-describe." },
    { title: "Three scenarios, one platform", body: "Business collaboration, dating, and local companions. One account covers every kind of human connection you need." },
    { title: "AI meeting co-pilot", body: "From match to meet-up — linQ plans the entire encounter. No awkward chats, no flaked plans, just real-world results." },
  ],
  zh: [
    { title: "零负担 AI 档案", body: "无需填表，无需贴标签。AI 默默从你的行为中理解你真正是谁 —— 而不是你如何描述自己。" },
    { title: "三大场景，一个平台", body: "商业合作、约会、本地伙伴。一个账号覆盖你需要的所有人际连接。" },
    { title: "AI保驾护航", body: "从匹配到见面 —— linQ 为整场约会规划一切。不再有尴尬寒暄，不再放鸽子，只有真实的结果。" },
  ],
  yue: [
    { title: "零負擔 AI 檔案", body: "唔使填表，唔使貼標籤。AI 會默默由你嘅行為入面，知道你真正係邊個 —— 而唔係你點形容自己。" },
    { title: "三大場景，一個平台", body: "商業合作、拍拖、本地朋友。一個帳號已經覆蓋晒你需要嘅所有人際連繫。" },
    { title: "AI 幫你搞掂約會", body: "由配對到見面 —— linQ 幫你成場規劃晒。唔使再尷尬寒暄，唔使再被放飛機，只有真實嘅結果。" },
  ],
};

export const stepsI18n = {
  en: [
    { n: "01", title: "Sign up & authorize", body: "Register and grant scenario-level permissions. Privacy stays in your control from day one." },
    { n: "02", title: "AI profile builds", body: "Behavioral signals are analyzed silently. A multi-dimensional profile of the real you is generated." },
    { n: "03", title: "Smart matching", body: "AI dynamically weights each scenario and surfaces the highest-fit people for what you need now." },
    { n: "04", title: "Meet with AI plan", body: "Get a full meet-up plan — time, place, ice-breakers. Just show up. linQ handles the rest." },
  ],
  zh: [
    { n: "01", title: "注册与授权", body: "注册并按场景授予权限。隐私从第一天起就在你掌控中。" },
    { n: "02", title: "AI 档案构建", body: "行为信号被默默分析，生成一份多维度的真实自我画像。" },
    { n: "03", title: "智能匹配", body: "AI 动态权衡每个场景，为你当下的需求呈现最契合的人。" },
    { n: "04", title: "AI 规划的见面", body: "拿到完整的见面方案 —— 时间、地点、破冰话题。你只管赴约，其余交给 linQ。" },
  ],
  yue: [
    { n: "01", title: "註冊同授權", body: "註冊並按場景俾返相應權限。喺第一日開始，私隱就由你話事。" },
    { n: "02", title: "AI 建立你嘅檔案", body: "你嘅行為會被默默分析，幫你整一份多維度嘅真實自我畫像。" },
    { n: "03", title: "智能配對", body: "AI 會動態平衡唔同場景，為你當下嘅需要，搵出最夾嘅人。" },
    { n: "04", title: "由 AI 規劃嘅見面", body: "拎到完整嘅見面方案 —— 時間、地點、破冰話題。你負責赴約，其他嘢由 linQ 幫你搞掂。" },
  ],
};

export const compareRowsI18n = {
  en: [
    ["Profile building", "Tinder / Hinge — endless swiping & curated personas", "Effortless Claude-powered behavioral profile"],
    ["Authenticity", "RedNote · Coffee Chat — performative posts & filtered selves", "Honest signals from how you actually behave"],
    ["Onboarding", "RedNote / WeChat — fill bio, tags, MBTI, hobbies, photos, voice intro…", "Zero forms. Claude reads your real behavior."],
    ["Getting a reply", "WeChat — add friend, wait for accept, send 50 messages, maybe meet", "One tap. AI sends a ready-to-go invite to both sides."],
    ["Scenarios", "Siloed apps: LinkedIn for work, Hinge for love, Meetup for friends", "Business, dating & local — one unified graph"],
    ["Effort to meet", "Match, then 100+ messages of small talk", "AI plans the meet-up. Just show up."],
    ["Outcome", "Ghosting, flakes, and dead chats", "Real-world dates, deals, and friendships"],
  ],
  zh: [
    ["档案构建", "Tinder / Hinge —— 无尽滑动与精心包装的人设", "由 Claude大模型驱动的零负担档案"],
    ["真实度", "小红书 · Coffee Chat —— 表演式贴文与过滤后的自己", "源自你真实行为的诚实信号"],
    ["入门", "社交媒体 —— 简介、标签、MBTI、兴趣、照片、语音…", "零提交信息，Claude大模型读懂你的真实行为。"],
    ["获得回复", "微信 —— 加好友、等通过、发 50 条消息，或许能见面", "一键即达，AI 把现成的邀请同时送达双方。"],
    ["场景", "孤岛 App：LinkedIn 谈事业、Hinge 谈恋爱、Meetup 找朋友", "商业、约会、本地 —— 同一张人际图谱"],
    ["见面成本", "匹配后还要寒暄 100+ 条消息", "AI 规划好见面，你只管赴约。"],
    ["结果", "已读不回、放鸽子、聊死的对话", "真实的约会、生意与友谊"],
  ],
  yue: [
    ["檔案建立", "Tinder / Hinge —— 停唔到嘅 swipe 同精心包裝嘅人設", "由 Claude 模型驅動嘅零負擔檔案"],
    ["真實度", "小紅書 · Coffee Chat —— 表演式嘅帖文同濾鏡後嘅自己", "源自你真實行為嘅誠實信號"],
    ["入門", "社交媒體 —— 自介、tag、MBTI、興趣、相、語音…", "乜都唔使填，Claude 模型讀得明你真實嘅行為。"],
    ["收到回覆", "WhatsApp / WeChat —— 加好友、等通過、send 50 個 message，可能先見到面", "一撳搞掂，AI 即刻將現成嘅邀請送俾雙方。"],
    ["場景", "散晒嘅 App：LinkedIn 做嘢、Hinge 拍拖、Meetup 識朋友", "商業、拍拖、本地 —— 同一張人際圖譜"],
    ["見面成本", "配對完仲要 send 100+ 個 message 吹水", "AI 幫你規劃好晒見面，你負責赴約。"],
    ["結果", "已讀不回、放飛機、吹死死嘅對話", "真實嘅約會、生意同友誼"],
  ],
};

export const trustI18n = {
  en: [
    { title: "Three-tier privacy", body: "Granular authorization with physically isolated data layers across scenarios." },
    { title: "No data misuse", body: "Nothing is sold. Nothing is force-collected. Compliance is the floor, not the goal." },
    { title: "Explainable AI", body: "Every match comes with reasoning. Fair, auditable, and accountable by design." },
  ],
  zh: [
    { title: "三层隐私管理", body: "细粒度授权，跨场景的数据层在物理上彼此隔离。" },
    { title: "拒绝数据滥用", body: "绝不出售，绝不强制收集。合规是底线，不是目标。" },
    { title: "监管下的深度AI", body: "每一次匹配都有理由可循。公平、可审计、有责可究。" },
  ],
  yue: [
    { title: "三層私隱管理", body: "細緻嘅授權，唔同場景嘅數據層喺物理上完全隔離。" },
    { title: "拒絕濫用數據", body: "絕對唔會出售，絕對唔會強制收集。合規只係最基本嘅要求，唔係目標。" },
    { title: "可解釋嘅 AI", body: "每次配對都會有原因。公平、可以審查、有問責嘅設計。" },
  ],
};

export const momentsI18n = {
  en: [
    { tag: "Coffee Chat · SF", name: "Leo & Maya", quote: "AI nailed our vibe. Two hours flew by." },
    { tag: "Rooftop · NYC", name: "Jay & Priya", quote: "Way better than juggling 10 Hinge chats." },
    { tag: "Business · Shanghai", name: "Founders Dinner", quote: "Met my co-founder on linQ. Closed seed in 6 weeks." },
    { tag: "Partnership · London", name: "Alex & Jordan", quote: "Skipped 20 LinkedIn DMs. Just met. Just clicked." },
    { tag: "First Date · Tokyo", name: "Mia & Daniel", quote: "AI picked the place. We picked each other." },
    { tag: "Local Friends · Austin", name: "Game Night Crew", quote: "Found my Sunday people in one tap." },
  ],
  zh: [
    { tag: "Coffee Chat · 旧金山", name: "Leo & Maya", quote: "AI 抓准了我们的频率，两小时一晃而过。" },
    { tag: "屋顶 · 纽约", name: "Jay & Priya", quote: "比同时聊 10 个 Hinge 强太多了。" },
    { tag: "商业 · 上海", name: "创始人晚餐", quote: "在 linQ 遇见联合创始人，6 周完成种子轮。" },
    { tag: "合作 · 伦敦", name: "Alex & Jordan", quote: "省下了 20 条 LinkedIn 私信，一见如故。" },
    { tag: "初次约会 · 东京", name: "Mia & Daniel", quote: "AI 选了地点，我们选了彼此。" },
    { tag: "本地好友 · 奥斯汀", name: "桌游之夜", quote: "一键找到了我的周日固定朋友。" },
  ],
  yue: [
    { tag: "Coffee Chat · 三藩市", name: "Leo & Maya", quote: "AI 捉到我哋嘅 frequency，兩個鐘轉眼就過。" },
    { tag: "天台 · 紐約", name: "Jay & Priya", quote: "好過同時同 10 個人喺 Hinge 傾偈。" },
    { tag: "商業 · 上海", name: "創辦人晚宴", quote: "喺 linQ 識到 Co-founder，6 個禮拜搞掂 seed round。" },
    { tag: "合作 · 倫敦", name: "Alex & Jordan", quote: "慳返 20 個 LinkedIn DM，一見如故。" },
    { tag: "第一次約會 · 東京", name: "Mia & Daniel", quote: "AI 揀咗地點，我哋揀咗對方。" },
    { tag: "本地好友 · 奧斯汀", name: "Game Night 班底", quote: "一撳就搵到我嘅 Sunday 班。" },
  ],
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "en" || saved === "zh" || saved === "yue") {
      setLangState(saved);
      return;
    }
    const n = navigator.language.toLowerCase();
    if (n.startsWith("zh-hk") || n.startsWith("yue")) setLangState("yue");
    else if (n.startsWith("zh")) setLangState("zh");
  }, []);
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
