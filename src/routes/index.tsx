import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Minus, Headphones, Instagram, Twitter, Github, Linkedin, Mail, MessageCircle, Sparkles, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CookieBanner } from "@/components/CookieBanner";
const ogImageUrl = "/og-image.jpg";
import moment1 from "@/assets/moment-1.jpg";
import moment2 from "@/assets/moment-2.jpg";
import moment3 from "@/assets/moment-3.jpg";
import moment4 from "@/assets/moment-4.jpg";
import moment5 from "@/assets/moment-5.jpg";
import moment6 from "@/assets/moment-6.jpg";
import {
  LanguageProvider,
  useLang,
  valuesI18n,
  stepsI18n,
  compareRowsI18n,
  trustI18n,
  momentsI18n,
} from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "linQ — The Claude-native matching platform" },
      { name: "description", content: "AI-powered matching for work, love, and life. Business, dating, and local friends — one AI connection covers them all." },
      { property: "og:title", content: "linQ — The Claude-native matching platform" },
      { property: "og:description", content: "AI-powered matching for work, love, and life." },
      { property: "og:url", content: "https://claudematch.com" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://claudematch.com${ogImageUrl}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "linQ — Claude-powered connections" },
      { name: "twitter:description", content: "No forms. No tags. Just the real you." },
      { name: "twitter:image", content: `https://claudematch.com${ogImageUrl}` },
    ],
    links: [
      { rel: "canonical", href: "https://claudematch.com" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "linQ",
          url: "https://claudematch.com",
          description: "The Claude-native matching platform for business, dating, and local life.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "linQ",
          url: "https://claudematch.com",
          description: "AI-powered matching for work, love, and life. Business, dating, and local friends — one Claude-native connection covers them all.",
        }),
      },
    ],
  }),
  component: Index,
});

function Nav() {
  const { t, lang, setLang } = useLang();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="text-lg font-semibold tracking-tight">
          lin<span className="font-display text-primary text-2xl align-middle">Q</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#values" className="transition-colors hover:text-foreground">{t("nav_why")}</a>
          <a href="#how" className="transition-colors hover:text-foreground">{t("nav_how")}</a>
          <a href="#moments" className="transition-colors hover:text-foreground">{t("nav_moments")}</a>
          <a href="#compare" className="transition-colors hover:text-foreground">{t("nav_compare")}</a>
          <a href="#trust" className="transition-colors hover:text-foreground">{t("nav_trust")}</a>
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            aria-label="Toggle language"
            className="inline-flex h-9 items-center rounded-sm border border-border bg-background/40 px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
          >
            {lang === "zh" ? "EN" : "中文"}
          </button>
          <a
            href="#support"
            className="hidden md:inline-flex h-9 items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <Headphones className="h-3.5 w-3.5" />
            {t("nav_support")}
          </a>
          <a
            href="/auth"
            className="inline-flex h-9 items-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("nav_getStarted")}
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const { t } = useLang();
  return (
    <section className="relative border-b border-border/60 overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28 md:py-40">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-[11px] sm:text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("hero_badge")}
          </div>
          <h1 className="text-[2.5rem] sm:text-5xl font-semibold leading-[1.1] sm:leading-[1.05] tracking-tight md:text-7xl">
            <span className="font-display text-gold-glow">{t("hero_claude")}</span>{" "}
            <span className="font-display text-gold-glow">{t("hero_connections")}</span>
            <br />
            <span className="font-display text-foreground/50">{t("hero_for")}</span>{" "}
            <span className="font-display text-[#3b82f6]">{t("hero_work")}</span>
            <span className="font-display text-foreground/30">​</span>{" "}
            <span className="font-display text-[#ef4444]">{t("hero_love")}</span>
            <span className="font-display text-foreground/30">​</span>{" "}
            <span className="font-display text-[#22c55e]">{t("hero_life")}</span>
            <span className="font-display text-foreground/30">​</span>
          </h1>
          <p className="mx-auto mt-6 sm:mt-8 max-w-2xl text-[15px] leading-[1.75] sm:leading-relaxed text-muted-foreground sm:text-base md:text-lg whitespace-pre-line">
            {t("hero_desc")}
          </p>
          <div className="mt-10 sm:mt-12 flex items-center justify-center">
            <a
              href="/auth"
              className="group relative inline-flex h-14 items-center gap-3 rounded-sm bg-primary pl-3 pr-6 text-sm font-medium text-primary-foreground shadow-[0_20px_60px_-12px_oklch(0.85_0.17_90/0.65),0_0_0_1px_oklch(0.85_0.17_90/0.4),inset_0_1px_0_oklch(1_0_0/0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_28px_80px_-12px_oklch(0.85_0.17_90/0.8),0_0_0_1px_oklch(0.85_0.17_90/0.6),inset_0_1px_0_oklch(1_0_0/0.45)]"
            >
              <span className="font-display text-2xl leading-none tabular-nums text-primary-foreground/95 drop-shadow-[0_1px_0_oklch(0.30_0.10_80)]">
                156,070
              </span>
              <span className="h-6 w-px bg-primary-foreground/25" />
              <span className="tracking-wide uppercase">{t("hero_joinNow")}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function useCountdown(target: Date) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (now === null) return { d: "--", h: "--", m: "--", s: "--", ready: false };
  const diff = Math.max(0, target.getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d: pad(d), h: pad(h), m: pad(m), s: pad(s), ready: true };
}

function nextWednesday() {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntil = (3 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntil);
  next.setUTCHours(19, 0, 0, 0);
  return next;
}

function WeeklyDate() {
  const { lang, t } = useLang();
  const target = nextWednesday();
  const { d, h, m, s, ready } = useCountdown(target);
  const dateLabel = target.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Shanghai" });
  const now = ready ? new Date() : null;
  const isMatchDay = Boolean(now && now.getUTCDay() === 3 && now.getUTCHours() < 19);
  return (
    <section id="weekly" className="relative overflow-hidden border-b border-border/60 bg-secondary/30">
      <div className="absolute inset-0 -z-10 opacity-40" aria-hidden="true"
        style={{ background: "radial-gradient(60% 50% at 50% 0%, oklch(0.85 0.17 90 / 0.18), transparent 70%)" }} />
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24 md:py-32">
        <div className="grid items-center gap-14 sm:gap-12 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">{t("weekly_kicker")}</p>
            <h2 className="mt-4 font-display text-[2.75rem] sm:text-5xl leading-[1.05] sm:leading-[0.95] tracking-tight md:text-7xl">
              <span className="text-gold-glow">{t("weekly_title1")}</span>
              <br />
              <span className="italic">{t("weekly_title2")}</span>
            </h2>
            <p className="mt-5 sm:mt-6 max-w-md text-[15px] leading-[1.75] text-muted-foreground sm:text-sm sm:leading-relaxed md:text-base">
              {t("weekly_desc")}
            </p>

            {isMatchDay ? (
              <p className="mt-8 sm:mt-10 font-display text-2xl sm:text-3xl leading-snug text-gold-glow md:text-4xl">
                {lang === "zh" ? "今天就是匹配日！你的专属匹配已就绪。" : "Match Day is here! Your curated match is ready."}
              </p>
            ) : (
            <div className="mt-8 sm:mt-10 flex items-end gap-2 sm:gap-3 font-display text-4xl sm:text-5xl tracking-tight text-gold-glow md:text-6xl">
              {[
                { v: d, l: t("weekly_days") },
                { v: h, l: t("weekly_hrs") },
                { v: m, l: t("weekly_min") },
                { v: s, l: t("weekly_sec") },
              ].map((c, i) => (
                <div key={c.l} className="flex items-end gap-3">
                  <div className="flex flex-col items-center">
                    <span className="tabular-nums">{c.v}</span>
                    <span className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{c.l}</span>
                  </div>
                  {i < 3 && <span className="pb-6 text-muted-foreground/40">:</span>}
                </div>
              ))}
            </div>
            )}

            <div className="mt-6 space-y-1 text-sm text-muted-foreground">
              <p>{t("weekly_next")} <span className="text-foreground">{dateLabel}</span></p>
              <p>{t("weekly_joined")} <span className="text-foreground">156,070</span></p>
            </div>
          </div>

          <div className="relative mx-auto flex h-[420px] w-full max-w-md items-center justify-center md:h-[480px]">
            <div className="absolute inset-0 -z-10 blur-3xl opacity-50"
              style={{ background: "radial-gradient(40% 40% at 50% 50%, oklch(0.85 0.17 90 / 0.35), transparent 70%)" }} />
            <figure className="polaroid -rotate-3 w-[240px] md:w-[280px]">
              <img src={moment2} alt="Weekly match meet-up" loading="lazy" className="aspect-[4/5] w-full object-cover" />
              <figcaption className="mt-3 px-1 text-left">
                <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "oklch(0.45 0.03 260)" }}>Match Day · Wed</div>
                <div className="mt-1 text-sm font-medium" style={{ color: "oklch(0.2 0.03 260)" }}>Jay & Priya</div>
              </figcaption>
            </figure>
            <figure className="polaroid rotate-6 absolute right-2 top-8 w-[170px] md:w-[200px]">
              <img src={moment5} alt="Weekly match meet-up" loading="lazy" className="aspect-square w-full object-cover" />
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

function SendRealYou() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const placeholder =
    lang === "zh"
      ? "用一句话描述你自己，比如\"28岁产品经理，喜欢 hiking 和爵士乐，想找能聊得来的朋友\""
      : 'Describe yourself in one sentence, e.g. "28-year-old PM who loves hiking and jazz, looking for someone to talk with"';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitted(true);
    localStorage.setItem("linq_onboarding_text", text.trim());
    setTimeout(() => navigate({ to: "/auth" }), 400);
  };

  return (
    <section id="send" className="relative overflow-hidden border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {t("send_badge")}
          </div>
          <h2 className="text-[2.25rem] sm:text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
            <span className="text-gold-glow">{t("send_title1")}</span>
            <br />
            <span className="font-display italic text-muted-foreground">{t("send_title2")}</span>
          </h2>
          <p className="mx-auto mt-5 sm:mt-6 max-w-xl text-[15px] leading-[1.75] text-muted-foreground sm:text-sm sm:leading-relaxed md:text-base">
            {t("send_desc")}
          </p>

          <form onSubmit={handleSubmit} className="mt-12 flex flex-col items-center gap-4">
            <div className="relative w-full max-w-lg">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-background/60 px-5 py-4 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
              />
              <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground/50">
                {text.length}/200
              </div>
            </div>
            <button
              type="submit"
              disabled={submitted || !text.trim()}
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitted ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {lang === "zh" ? "正在启动…" : "Starting…"}
                </>
              ) : (
                <>
                  {lang === "zh" ? "开始匹配" : "Start Matching"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">{t("send_terms")}</p>
        </div>
      </div>
    </section>
  );
}

function Values() {
  const { lang, t } = useLang();
  const values = valuesI18n[lang];
  return (
    <section id="values" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("values_kicker")}</p>
          <h2 className="mt-4 text-[1.75rem] sm:text-3xl font-semibold leading-[1.2] tracking-tight md:text-5xl">
            {t("values_title")}
          </h2>
        </div>
        <div className="mt-12 sm:mt-16 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-3">
          {values.map((v, i) => (
            <div key={i} className="bg-background p-7 sm:p-8 md:p-10">
              <div className="text-sm font-medium text-primary">0{i + 1}</div>
              <h3 className="mt-5 sm:mt-6 text-lg sm:text-xl font-semibold leading-snug tracking-tight">{v.title}</h3>
              <p className="mt-3 sm:mt-4 text-[15px] leading-[1.7] text-muted-foreground sm:text-sm sm:leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { lang, t } = useLang();
  const steps = stepsI18n[lang];
  return (
    <section id="how" className="border-b border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("how_kicker")}</p>
          <h2 className="mt-4 text-[1.75rem] sm:text-3xl font-semibold leading-[1.2] tracking-tight md:text-5xl">
            {t("how_title")}
          </h2>
        </div>
        <div className="mt-12 sm:mt-16 grid gap-10 sm:gap-12 md:grid-cols-4 md:gap-8">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="text-sm font-medium text-primary">{s.n}</div>
              <div className="mt-4 h-px w-full bg-border" />
              <h3 className="mt-5 sm:mt-6 text-lg font-semibold leading-snug tracking-tight">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground sm:text-sm sm:leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Compare() {
  const { lang, t } = useLang();
  const compareRows = compareRowsI18n[lang];
  return (
    <section id="compare" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("compare_kicker")}</p>
          <h2 className="mt-4 text-[1.75rem] sm:text-3xl font-semibold leading-[1.2] tracking-tight md:text-5xl">
            {t("compare_title")}
          </h2>
        </div>
        <div className="mt-12 sm:mt-16 overflow-x-auto overflow-hidden rounded-sm border border-border">
          <div className="grid grid-cols-3 border-b border-border bg-secondary/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <div className="p-5"></div>
            <div className="p-5">{t("compare_col_trad")}</div>
            <div className="p-5 text-foreground">{t("compare_col_linq")}</div>
          </div>
          {compareRows.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-3 text-sm ${i !== compareRows.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="p-5 font-medium">{row[0]}</div>
              <div className="flex items-start gap-2 p-5 text-muted-foreground">
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                <span>{row[1]}</span>
              </div>
              <div className="flex items-start gap-2 p-5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{row[2]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  const { lang, t } = useLang();
  const trust = trustI18n[lang];
  return (
    <section id="trust" className="border-b border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("trust_kicker")}</p>
          <h2 className="mt-4 text-[1.75rem] sm:text-3xl font-semibold leading-[1.2] tracking-tight md:text-5xl">
            {t("trust_title")}
          </h2>
        </div>
        <div className="mt-12 sm:mt-16 grid gap-8 sm:gap-10 md:grid-cols-3">
          {trust.map((t, i) => (
            <div key={i} className="border-t border-foreground pt-6">
              <h3 className="text-lg font-semibold leading-snug tracking-tight">{t.title}</h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground sm:text-sm sm:leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  const { t } = useLang();
  return (
    <section id="cta" className="border-b border-border/60">
      <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-6 sm:py-28 md:py-40">
        <h2 className="text-[2.25rem] sm:text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
          <span className="text-gold-glow">{t("cta_start")}</span>{" "}
          <span className="font-display text-gold-glow">{t("cta_matching")}</span>.
          <br />
          <span className="text-muted-foreground">{t("cta_real")}</span>
        </h2>
        <div className="mt-12 flex items-center justify-center">
          <a
            href="/auth"
            className="group inline-flex h-12 items-center gap-2 rounded-sm bg-primary px-7 text-sm font-medium text-primary-foreground shadow-[0_8px_40px_-8px_oklch(0.85_0.17_90/0.55)] transition-colors hover:bg-primary/90"
          >
            {t("cta_btn")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Moments() {
  const { lang, t } = useLang();
  const imgs = [moment1, moment2, moment3, moment4, moment5, moment6];
  const rotates = ["-rotate-3", "rotate-2", "-rotate-2", "rotate-1", "-rotate-1", "rotate-3"];
  const moments = momentsI18n[lang].map((m, i) => ({ ...m, src: imgs[i], rotate: rotates[i] }));
  const loop = [...moments, ...moments];
  return (
    <section id="moments" className="border-b border-border/60">
      <div className="py-20 sm:py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("moments_kicker")}</p>
          <h2 className="mt-4 text-[1.75rem] sm:text-3xl font-semibold leading-[1.2] tracking-tight md:text-5xl">
            <span className="font-display text-gold-glow">{t("moments_title1")}</span> {t("moments_title2")}
          </h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-muted-foreground sm:text-sm sm:leading-relaxed md:text-base">
            {t("moments_desc")}
          </p>
        </div>
        <div
          className="marquee-wrap mt-16 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          }}
        >
          <div className="marquee px-6">
            {loop.map((m, i) => (
              <figure
                key={i}
                className={`polaroid ${m.rotate} w-[220px] shrink-0 md:w-[260px]`}
              >
                <img
                  src={m.src}
                  alt={`${m.name} — ${m.tag}`}
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="aspect-square w-full object-cover"
                />
                <figcaption className="mt-3 px-1 text-left">
                  <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "oklch(0.45 0.03 260)" }}>{m.tag}</div>
                  <div className="mt-1 text-sm font-medium" style={{ color: "oklch(0.2 0.03 260)" }}>{m.name}</div>
                  <p className="mt-1 text-xs leading-snug" style={{ color: "oklch(0.35 0.03 260)" }}>"{m.quote}"</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { lang, t } = useLang();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      setMsg(lang === "zh" ? "请输入有效邮箱。" : "Please enter a valid email.");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) throw new Error("failed");
      setState("success");
      setMsg(lang === "zh" ? "感谢！已加入列表。" : "Thanks! You're on the list.");
      setEmail("");
    } catch {
      setState("error");
      setMsg(lang === "zh" ? "提交失败，请稍后再试。" : "Something went wrong. Try again.");
    }
  };

  return (
    <footer id="support" className="relative overflow-hidden border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-10">
        <div className="grid gap-16 md:grid-cols-12">
          {/* Brand + tagline bubble */}
          <div className="md:col-span-5">
            <div className="relative inline-block max-w-xs rounded-2xl rounded-bl-sm bg-foreground px-5 py-4 text-sm font-medium leading-snug text-background shadow-lg">
              {t("footer_bubble")}
              <span className="absolute -bottom-2 left-4 h-4 w-4 rotate-45 bg-foreground" />
            </div>
            <div className="mt-10 font-display text-6xl leading-none text-gold-glow md:text-7xl">
              lin<span className="italic">Q</span>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("footer_tag")}
            </p>
          </div>

          {/* Link columns */}
          <div className="md:col-span-7 grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("footer_product")}</p>
              <ul className="mt-5 space-y-3 text-sm">
                <li><a href="#values" className="text-foreground/80 transition-colors hover:text-primary">{t("nav_why")}</a></li>
                <li><a href="#how" className="text-foreground/80 transition-colors hover:text-primary">{t("nav_how")}</a></li>
                <li><a href="#moments" className="text-foreground/80 transition-colors hover:text-primary">{t("nav_moments")}</a></li>
                <li><a href="#compare" className="text-foreground/80 transition-colors hover:text-primary">{t("nav_compare")}</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("footer_resources")}</p>
              <ul className="mt-5 space-y-3 text-sm">
                <li><a href="#" className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-primary">{t("footer_careers")} <ArrowRight className="h-3 w-3 -rotate-45" /></a></li>
                <li><a href="#" className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-primary">{t("footer_manifesto")} <ArrowRight className="h-3 w-3 -rotate-45" /></a></li>
                <li><a href="#" className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-primary">{t("footer_press")} <ArrowRight className="h-3 w-3 -rotate-45" /></a></li>
                <li><a href="#" className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-primary">{t("footer_blog")} <ArrowRight className="h-3 w-3 -rotate-45" /></a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("footer_support")}</p>
              <ul className="mt-5 space-y-3 text-sm">
                <li className="flex items-center gap-2 text-foreground/80">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  {t("footer_chat")}
                </li>
                <li><a href="mailto:hi@linq.app" className="inline-flex items-center gap-1.5 text-foreground/80 transition-colors hover:text-primary"><Mail className="h-3.5 w-3.5" /> {lang === "zh" ? "vip专属会员中心" : "hi@linq.app"}</a></li>
                <li><Link to="/trust" className="text-foreground/80 transition-colors hover:text-primary">{t("footer_trust")}</Link></li>
                <li><a href="#" className="text-foreground/80 transition-colors hover:text-primary">{t("footer_help")}</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Newsletter strip */}
        <div className="mt-16 flex flex-col gap-4 rounded-2xl border border-border/60 bg-secondary/40 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-xl text-foreground">{t("footer_news_title")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("footer_news_desc")}</p>
          </div>
          <div className="w-full md:max-w-sm">
            <form onSubmit={submit} className="flex w-full items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email address"
                placeholder="your@email.com"
                className="h-10 flex-1 rounded-sm border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                disabled={state === "loading"}
              />
              <button
                type="submit"
                disabled={state === "loading"}
                className="inline-flex h-10 items-center gap-1 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {state === "loading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>{t("footer_news_join")} <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </button>
            </form>
            {msg && (
              <p className={`mt-2 text-xs ${state === "success" ? "text-primary" : "text-destructive"}`}>{msg}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <a href="#" aria-label="Instagram" className="transition-colors hover:text-primary"><Instagram className="h-4 w-4" /></a>
            <a href="#" aria-label="X / Twitter" className="transition-colors hover:text-primary"><Twitter className="h-4 w-4" /></a>
            <a href="#" aria-label="LinkedIn" className="transition-colors hover:text-primary"><Linkedin className="h-4 w-4" /></a>
            <a href="#" aria-label="GitHub" className="transition-colors hover:text-primary"><Github className="h-4 w-4" /></a>
          </div>
          <p>© {new Date().getFullYear()} {t("footer_copy")}</p>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="transition-colors hover:text-primary">{t("footer_terms")}</Link>
            <Link to="/privacy" className="transition-colors hover:text-primary">{t("footer_privacy")}</Link>
            <Link to="/cookies" className="transition-colors hover:text-primary">{t("footer_cookies")}</Link>
            <Link to="/dpa" className="transition-colors hover:text-primary">{t("footer_dpa")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <LanguageProvider>
    <div className="min-h-screen bg-background text-foreground">
      <div className="aurora" aria-hidden="true">
        <div className="aurora-extra" />
        <div className="aurora-extra-2" />
        <div className="aurora-extra-3" />
      </div>
      <div className="stars" aria-hidden="true" />
      <span className="orb orb-1" aria-hidden="true" />
      <span className="orb orb-2" aria-hidden="true" />
      <span className="orb orb-3" aria-hidden="true" />
      <span className="orb orb-4" aria-hidden="true" />
      <span className="orb orb-5" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Nav />
      <main>
        <Hero />
        <WeeklyDate />
        <SendRealYou />
        <Values />
        <HowItWorks />
        <Moments />
        <Compare />
        <Trust />
        <FinalCTA />
      </main>
      <Footer />
      <CookieBanner />
    </div>
    </LanguageProvider>
  );
}
