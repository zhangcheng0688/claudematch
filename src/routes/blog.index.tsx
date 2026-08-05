import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://claudematch.com";

type PostListItem = {
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  published_at: string | null;
};

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "linQ 笔记 — AI 婚恋匹配的第一手思考" },
      {
        name: "description",
        content:
          "linQ 团队关于 AI 匹配、每周三约会机制、隐私优先和深圳/香港冷启动的第一手笔记。",
      },
      { property: "og:title", content: "linQ 笔记" },
      {
        property: "og:description",
        content: "AI 匹配、每周三约会机制、隐私优先 —— linQ 团队的第一手笔记。",
      },
      { property: "og:url", content: `${BASE_URL}/blog` },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/blog` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "linQ 笔记",
          url: `${BASE_URL}/blog`,
          description: "linQ 团队关于 AI 匹配与隐私优先产品构建的第一手笔记。",
          publisher: { "@type": "Organization", name: "linQ", url: BASE_URL },
        }),
      },
    ],
  }),
  component: () => (
    <LanguageProvider>
      <BlogPage />
    </LanguageProvider>
  ),
});

function BlogPage() {
  const { lang } = useLang();
  const t = (en: string, zh: string, yue: string) =>
    lang === "yue" ? yue : lang === "zh" ? zh : en;

  const [posts, setPosts] = useState<PostListItem[] | null>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("blog_posts")
      .select("slug, locale, title, excerpt, author, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setPosts((data as PostListItem[] | null) ?? []));
  }, []);

  // Prefer the active locale; fall back to zh (our primary writing locale),
  // then to whatever exists.
  const all = posts ?? [];
  const inLang = all.filter((p) => p.locale === lang);
  const inZh = all.filter((p) => p.locale === "zh");
  const list = inLang.length ? inLang : inZh.length ? inZh : all;

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
          "Done. We'll send the next post the day it ships.",
          "搞定，下一篇发布当天就送到。",
          "搞掂，下一篇出街當日就送到。",
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
            "On AI matching, the Wednesday cadence, and building a privacy-first dating product for Shenzhen & Hong Kong.",
            "关于 AI 匹配、每周三约会机制，以及一个为深圳和香港打造的隐私优先婚恋产品。",
            "關於 AI 配對、每個禮拜三約會機制，同一個為深圳同香港打造嘅私隱優先婚戀產品。",
          )}
        </p>

        {posts === null ? (
          <div className="mt-16 flex justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <p className="mt-16 text-sm text-muted-foreground">
            {t(
              "First post is on its way — subscribe below.",
              "第一篇正在路上 —— 在下方订阅。",
              "第一篇就嚟出街 —— 喺下面訂閱。",
            )}
          </p>
        ) : (
          <ul className="mt-12 space-y-8">
            {list.map((p) => (
              <li key={`${p.locale}-${p.slug}`}>
                <Link
                  to="/blog/$slug"
                  params={{ slug: p.slug }}
                  className="group block rounded-sm border border-border bg-background/40 p-6 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    <span>{p.author ?? "linQ"}</span>
                    {p.published_at && (
                      <>
                        <span>·</span>
                        <span>{p.published_at.slice(0, 10)}</span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-semibold leading-snug tracking-tight">
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p className="mt-3 text-[15px] leading-[1.75] text-muted-foreground">
                      {p.excerpt}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-1 text-xs text-primary">
                    <span>{t("Read", "阅读全文", "閱讀全文")}</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

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
