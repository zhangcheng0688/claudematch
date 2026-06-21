import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";

const BASE_URL = "https://claudematch.com";

function buildBlogSchema(lang: "en" | "zh" | "yue") {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: lang === "zh" ? "linQ 笔记" : lang === "yue" ? "linQ 筆記" : "linQ Journal",
    url: `${BASE_URL}/blog`,
    description:
      lang === "zh"
        ? "linQ 团队关于 AI 匹配、隐私优先和 Claude-native 产品构建的第一手笔记。"
        : lang === "yue"
          ? "linQ 團隊關於 AI 配對、私隱優先同 Claude-native 產品構建嘅第一手筆記。"
          : "Field notes from the linQ team on AI matching, privacy by default, and Claude-native product building.",
    publisher: {
      "@type": "Organization",
      name: "linQ",
      url: BASE_URL,
    },
    blogPost: DRAFTS.map((p, i) => ({
      "@type": "BlogPosting",
      headline: p.title[lang],
      description: p.excerpt[lang],
      author: { "@type": "Organization", name: "linQ" },
      publisher: { "@type": "Organization", name: "linQ", url: BASE_URL },
      url: `${BASE_URL}/blog/${i}`,
      inLanguage: lang === "yue" ? "zh-Hant" : lang,
    })),
  };
}

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Journal — linQ" },
      {
        name: "description",
        content:
          "Notes from the linQ team on AI matching, privacy by default, and what we're learning shipping a Claude-native platform.",
      },
      { property: "og:title", content: "linQ Journal" },
      {
        property: "og:description",
        content: "Field notes on AI matching, privacy, and Claude-native product building.",
      },
      { property: "og:url", content: "https://claudematch.com/blog" },
    ],
    links: [{ rel: "canonical", href: "https://claudematch.com/blog" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildBlogSchema("en")),
      },
    ],
  }),
  component: () => (
    <LanguageProvider>
      <BlogPage />
    </LanguageProvider>
  ),
});

type DraftPost = {
  title: { en: string; zh: string; yue: string };
  kicker: { en: string; zh: string; yue: string };
  excerpt: { en: string; zh: string; yue: string };
  minutes: number;
  status: "draft" | "in-review" | "shipping-soon";
};

const DRAFTS: DraftPost[] = [
  {
    title: {
      en: "Why we built linQ around 'one-tap matching' instead of swipes",
      zh: "为什么 linQ 选 '一键匹配'，而不是左滑右滑",
      yue: "點解 linQ 揀「一撳配對」，唔係左掃右掃",
    },
    kicker: {
      en: "Product story",
      zh: "产品故事",
      yue: "產品故事",
    },
    excerpt: {
      en: "Swipes optimize for volume, not fit. We wanted the opposite: a slow, deliberate, weekly cadence that respects both people's time. Here's the thesis behind the Wednesday match.",
      zh: "左滑右滑优化的是数量，不是契合度。我们要的是反面——一个慢的、慎重的、每周一次的对接节奏。这篇文章讲我们怎么从「周三约会」倒推出整套产品形态。",
      yue: "左掃右掃優化緊嘅係數量，唔係夾唔夾。我哋想要嘅係反面 —— 一個慢嘅、慎重嘅、每個禮拜一次嘅配對節奏。呢篇講我哋點樣由「禮拜三約會」倒推成個產品形態。",
    },
    minutes: 6,
    status: "shipping-soon",
  },
  {
    title: {
      en: "How AI profile inference actually works (and why we forbid verbatim quotes)",
      zh: "AI 画像推断到底是怎么做的（以及为什么我们禁止逐字复述）",
      yue: "AI 檔案推斷到底點做（仲有點解我哋禁咗逐字複述）",
    },
    kicker: {
      en: "Engineering",
      zh: "工程笔记",
      yue: "工程筆記",
    },
    excerpt: {
      en: "The hardest part of the AI profile isn't structure — it's teaching the model to see what the user didn't say. A walk through the prompt, the patterns array, and the 'why' behind each dimension score.",
      zh: "AI 画像最难的部分不是结构化——是教会模型「看到用户没说的事」。本文走查 prompt 的设计、patterns 数组的用法，以及每个维度评分背后的「why」。",
      yue: "AI 檔案最難嗰部分唔係結構化 —— 係教個模型「睇到用戶無講嘅嘢」。呢篇行勻個 prompt、patterns 陣嘅用法，再加每個維度評分背後嘅「why」。",
    },
    minutes: 9,
    status: "in-review",
  },
  {
    title: {
      en: "Privacy by default: what we DON'T collect",
      zh: "默认隐私：我们不收集什么",
      yue: "預設私隱：我哋唔收集咩",
    },
    kicker: {
      en: "Trust & safety",
      zh: "信任与安全",
      yue: "信任同安全",
    },
    excerpt: {
      en: "Most platforms brag about what they encrypt. We'd rather list the data we never touch — your social graph, your contacts, your location history, your photos. The shorter this list stays, the better the product gets.",
      zh: "大多数平台吹自己加密了什么。我们更愿意列出「永远不碰」的数据——你的社交图谱、通讯录、位置历史、照片。这个清单越短，产品越好。",
      yue: "大部分平台吹自己加密咗咩。我哋寧願列出「永遠唔掂」嘅資料 —— 你嘅社交圖譜、通訊錄、位置歷史、相。呢個清單越短，產品越好。",
    },
    minutes: 4,
    status: "draft",
  },
];

function statusLabel(s: DraftPost["status"], lang: "en" | "zh" | "yue") {
  if (s === "shipping-soon") {
    return { en: "Shipping this month", zh: "本月发布", yue: "本月出街" }[lang];
  }
  if (s === "in-review") {
    return { en: "In review", zh: "评审中", yue: "評審中" }[lang];
  }
  return { en: "Draft", zh: "草稿", yue: "草稿" }[lang];
}

function BlogPage() {
  const { lang } = useLang();
  const t = (en: string, zh: string, yue: string) =>
    lang === "yue" ? yue : lang === "zh" ? zh : en;

  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setMsg(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        setState("error");
        setMsg(t("Couldn't subscribe. Try again?", "订阅失败，请重试？", "訂閱失敗，再試吓？"));
        return;
      }
      setState("success");
      setMsg(
        t(
          "Done. We'll send the first post the day it ships.",
          "搞定，第一篇发布当天就送到。",
          "搞掂，第一篇出街當日就送到。",
        ),
      );
      setEmail("");
    } catch {
      setState("error");
      setMsg(t("Network error. Try again?", "网络出错，请重试？", "網絡出錯，再試吓？"));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← {t("Back to home", "返回首页", "返屋企")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          {t("Journal", "笔记", "筆記")}
        </p>
        <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight text-gold-glow md:text-5xl">
          {t("Field notes from the linQ team", "linQ 团队的第一手笔记", "linQ 團隊嘅第一手筆記")}
        </h1>
        <p className="mt-4 text-[15px] leading-[1.75] text-muted-foreground sm:text-base">
          {t(
            "Three drafts in flight right now. Subscribe and we'll send the first one the day it ships — usually within a week or two.",
            "目前有三篇草稿在写。订阅一下，第一篇发布当天就送到邮箱——通常一到两周内。",
            "而家有 three 篇草稿寫緊。訂閱一下，第一篇出街當日就送到 email —— 通常一兩個禮拜內。",
          )}
        </p>

        <ul className="mt-12 space-y-8">
          {DRAFTS.map((p, i) => (
            <li
              key={i}
              className="group relative rounded-sm border border-border bg-background/40 p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                <span>{p.kicker[lang]}</span>
                <span>·</span>
                <span>
                  {p.minutes} {t("min read", "分钟阅读", "分鐘閱讀")}
                </span>
                <span>·</span>
                <span className="text-primary">{statusLabel(p.status, lang)}</span>
              </div>
              <h2 className="mt-3 font-display text-2xl font-semibold leading-snug tracking-tight">
                {p.title[lang]}
              </h2>
              <p className="mt-3 text-[15px] leading-[1.75] text-muted-foreground">
                {p.excerpt[lang]}
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                <span>
                  {t(
                    "Subscribe below to read it first.",
                    "订阅即可第一时间阅读。",
                    "訂閱即可第一時間睇。",
                  )}
                </span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </li>
          ))}
        </ul>

        {/* Newsletter signup */}
        <div className="mt-16 rounded-2xl border border-border/60 bg-secondary/40 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold text-foreground">
                {t("Get the next one in your inbox", "下一篇送到你邮箱", "下一篇送到你 email")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "No tracking pixels. Unsubscribe with one click.",
                  "无追踪像素，一键退订。",
                  "無追蹤 pixel，一撳退訂。",
                )}
              </p>
            </div>
            <form
              onSubmit={submit}
              className="flex w-full items-center gap-2 sm:w-auto sm:min-w-[320px]"
            >
              <div className="flex h-10 flex-1 items-center gap-2 rounded-sm border border-border bg-background px-3 sm:flex-initial sm:w-64">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  disabled={state === "loading"}
                />
              </div>
              <button
                type="submit"
                disabled={state === "loading"}
                className="inline-flex h-10 items-center gap-1.5 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {state === "loading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : state === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <>
                    {t("Subscribe", "订阅", "訂閱")} <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
          {msg && (
            <p
              className={`mt-3 text-xs ${
                state === "success" ? "text-primary" : "text-destructive"
              }`}
            >
              {msg}
            </p>
          )}
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          {t("Prefer to talk to a human? ", "想直接找人聊？", "想直接搵人傾？")}
          <a
            href="mailto:zhangcheng0688@gmail.com?subject=linQ%20Journal"
            className="text-primary hover:underline"
          >
            {t("Email the team.", "给团队写邮件。", "Send 個 email 俾團隊。")}
          </a>
        </p>
      </main>
    </div>
  );
}
