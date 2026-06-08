import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "zh";

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
    weekly_joined: "Already Joined:",
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
    weekly_joined: "已加入：",
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
};

export const valuesI18n = {
  en: [
    { title: "Effortless AI profile", body: "No forms, no tags. AI quietly learns who you really are from the way you act — not the way you self-describe." },
    { title: "Three worlds, one account", body: "Business, dating, local. AI quietly figures out which is right for you — no picking required." },
    { title: "AI meeting co-pilot", body: "From match to meet-up — linQ plans the entire encounter. No awkward chats, no flaked plans, just real-world results." },
  ],
  zh: [
    { title: "零负担 AI 档案", body: "无需填表，无需贴标签。AI 默默从你的行为中理解你真正是谁 —— 而不是你如何描述自己。" },
    { title: "三个世界，一个账号", body: "商业、约会、本地。AI 默默判断哪个才是你需要的 —— 无需你主动选择。" },
    { title: "AI保驾护航", body: "从匹配到见面 —— linQ 为整场约会规划一切。不再有尴尬寒暄，不再放鸽子，只有真实的结果。" },
  ],
};

export const stepsI18n = {
  en: [
    { n: "01", title: "Sign up in 30s", body: "WeChat one-tap. We learn everything else from how you use linQ, not from forms you fill out." },
    { n: "02", title: "AI profile builds", body: "Behavioral signals are analyzed silently. A multi-dimensional profile of the real you is generated." },
    { n: "03", title: "Wednesday reveal", body: "Every Wednesday 7pm, AI curates one match. No swiping, no comparing, no choosing. Just one person, one plan, one date." },
    { n: "04", title: "Meet with AI plan", body: "Get a full meet-up plan — time, place, ice-breakers. Just show up. linQ handles the rest." },
  ],
  zh: [
    { n: "01", title: "30 秒注册", body: "微信一键登录。其它一切都由 AI 从你使用 linQ 的方式中学习，无需填表。" },
    { n: "02", title: "AI 档案构建", body: "行为信号被默默分析，生成一份多维度的真实自我画像。" },
    { n: "03", title: "周三揭晓", body: "每周三晚 7 点，AI 精心策划一场约会。不滑动，不比较，不挑选。只有一个人、一份方案、一场约会。" },
    { n: "04", title: "AI 规划的见面", body: "拿到完整的见面方案 —— 时间、地点、破冰话题。你只管赴约，其余交给 linQ。" },
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
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("lang") as Lang | null) : null;
    if (saved === "en" || saved === "zh") setLangState(saved);
    else if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh")) setLangState("zh");
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
