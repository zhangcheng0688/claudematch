import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowDown,
  Check,
  Minus,
  Headphones,
  Mail,
  MessageCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CookieBanner } from "@/components/CookieBanner";
import { MomentsImg } from "@/components/shared/MomentsImg";
import { delay, useReveal } from "@/lib/reveal";
const ogImageUrl = "/og-image.jpg";
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
      { title: "linQ — 深圳·香港 AI 婚恋匹配｜每周三，约一场真实见面" },
      {
        name: "description",
        content:
          "跟 AI 聊 5 分钟，每周三晚 7 点为你匹配一个人、订好一家真实餐厅。不滑动、不尬聊、不放鸽子。首期开放深圳与香港。",
      },
      { property: "og:title", content: "linQ — 深圳·香港 AI 婚恋匹配" },
      { property: "og:description", content: "每周三，约一场真实见面。AI 匹配 + 真实餐厅，你只管赴约。" },
      { property: "og:url", content: "https://claudematch.com" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `https://claudematch.com${ogImageUrl}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "linQ — AI matchmaking for Shenzhen & Hong Kong" },
      { name: "twitter:description", content: "A real date, arranged every Wednesday. No swiping, no small talk." },
      { name: "twitter:image", content: `https://claudematch.com${ogImageUrl}` },
    ],
    links: [{ rel: "canonical", href: "https://claudematch.com" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "linQ",
          url: "https://claudematch.com",
          description:
            "AI matchmaking for Shenzhen & Hong Kong. One curated match and one booked restaurant every Wednesday.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "linQ",
          url: "https://claudematch.com",
          description:
            "深圳与香港的 AI 婚恋匹配平台。每周三晚 7 点，一次匹配、一家真实餐厅。",
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
        <a href="/" className="text-lg font-semibold tracking-tight">
          lin<span className="font-display text-primary text-2xl align-middle">Q</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#values" className="transition-colors hover:text-foreground">
            {t("nav_why")}
          </a>
          <a href="#how" className="transition-colors hover:text-foreground">
            {t("nav_how")}
          </a>
          <a href="#moments" className="transition-colors hover:text-foreground">
            {t("nav_moments")}
          </a>
          <a href="#compare" className="transition-colors hover:text-foreground">
            {t("nav_compare")}
          </a>
          <a href="#trust" className="transition-colors hover:text-foreground">
            {t("nav_trust")}
          </a>
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

function BokehCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let w = 0;
    let h = 0;
    type P = {
      x: number; y: number; r: number; hue: number; sat: number; light: number;
      a: number; vx: number; vy: number; ph: number; sp: number;
    };
    let parts: P[] = [];
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(30, Math.max(16, w / 48)));
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 18 + Math.random() * 90,
        hue: 34 + Math.random() * 14,
        sat: 55 + Math.random() * 30,
        light: 45 + Math.random() * 20,
        a: 0.05 + Math.random() * 0.16,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08 - 0.02,
        ph: Math.random() * Math.PI * 2,
        sp: 0.001 + Math.random() * 0.002,
      }));
    };
    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        const pulse = 0.75 + 0.25 * Math.sin(p.ph + time * p.sp * 2);
        const x = p.x + Math.sin(p.ph + time * p.sp) * 18;
        const y = p.y + Math.cos(p.ph * 1.3 + time * p.sp) * 12;
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.r);
        g.addColorStop(0, `hsla(${p.hue} ${p.sat}% ${p.light}% / ${p.a * pulse})`);
        g.addColorStop(1, "hsla(40 60% 50% / 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const tick = (time: number) => {
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -p.r) p.x = w + p.r;
        if (p.x > w + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = h + p.r;
        if (p.y > h + p.r) p.y = -p.r;
      }
      draw(time);
      raf = requestAnimationFrame(tick);
    };
    resize();
    window.addEventListener("resize", resize);
    if (reduced) {
      draw(0);
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="bokeh-canvas" aria-hidden="true" />;
}

function Hero() {
  const { t, lang } = useLang();
  const [waitlist, setWaitlist] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const n = d?.data?.waitlist_count;
        if (typeof n === "number") setWaitlist(n);
      })
      .catch(() => {});
  }, []);
  const display = lang === "en" ? "font-display italic" : "font-display";
  const L = (en: string, zh: string, yue: string) =>
    lang === "yue" ? yue : lang === "zh" ? zh : en;
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-end overflow-hidden border-b border-border/60">
      <BokehCanvas />
      <div className="hero-bottom-blur" aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-8 pt-24 sm:px-6 md:pb-12">
        <div
          className="animate-blur-fade-up flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:text-sm"
          style={delay(100)}
        >
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("hero_badge")}
          </span>
        </div>
        <h1
          className="animate-blur-fade-up mt-6 max-w-4xl text-[2.6rem] font-semibold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl"
          style={delay(220)}
        >
          <span className={`${display} text-gold-glow`}>{t("hero_claude")}</span>{" "}
          <span className={`${display} text-gold-glow`}>{t("hero_connections")}</span>
          <br />
          <span className="mt-4 inline-block text-[0.48em] font-medium leading-snug tracking-normal text-foreground/70 sm:mt-5">
            {t("hero_for")}
            <span className="text-[#e0655a]">{t("hero_love")}</span>
          </span>
        </h1>
        <p
          className="animate-blur-fade-up mt-6 max-w-2xl whitespace-pre-line text-[15px] leading-[1.75] text-muted-foreground sm:text-base md:text-lg"
          style={delay(340)}
        >
          {t("hero_desc")}
        </p>
        <div
          className="animate-blur-fade-up mt-9 flex flex-wrap items-center gap-3 sm:gap-4"
          style={delay(460)}
        >
          <a
            href="/auth"
            className="btn-fill group inline-flex h-14 items-center gap-3 rounded-full bg-primary pl-6 pr-6 text-sm font-medium text-primary-foreground shadow-[0_20px_60px_-12px_oklch(0.85_0.17_90/0.65),0_0_0_1px_oklch(0.85_0.17_90/0.4),inset_0_1px_0_oklch(1_0_0/0.35)] transition-shadow hover:shadow-[0_28px_80px_-12px_oklch(0.85_0.17_90/0.8),0_0_0_1px_oklch(0.85_0.17_90/0.6),inset_0_1px_0_oklch(1_0_0/0.45)]"
          >
            <span className="font-display text-base leading-none text-primary-foreground/95">
              {lang === "zh"
                ? "每周三晚 7 点"
                : lang === "yue"
                  ? "每個禮拜三晚 7 點"
                  : "Every Wed · 7pm"}
            </span>
            <span className="h-6 w-px bg-primary-foreground/25" />
            <span className="uppercase tracking-wide">{t("hero_joinNow")}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#how"
            className="liquid-glass inline-flex h-14 items-center gap-2 rounded-full px-6 text-sm font-medium text-foreground/90 transition-colors hover:text-foreground"
          >
            {t("nav_how")}
            <ArrowDown className="h-4 w-4" />
          </a>
        </div>
        <p className="animate-blur-fade-up mt-5 text-xs text-muted-foreground" style={delay(540)}>
          {t("hero_secondary")}
        </p>

        <div
          className="animate-blur-fade-up mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border/60 pt-5 sm:mt-14 sm:grid-cols-4"
          style={delay(640)}
        >
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {L("Cities", "城市", "城市")}
            </p>
            <p className="mt-1.5 text-sm text-foreground">
              {L("Shenzhen · Hong Kong", "深圳 · 香港", "深圳 · 香港")}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {L("Match day", "匹配日", "配對日")}
            </p>
            <p className="mt-1.5 text-sm text-foreground">
              {L("Wednesday · 7:00 PM", "每周三 · 19:00", "每個禮拜三 · 19:00")}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {L("Waitlist", "候补名单", "候補名單")}
            </p>
            <p className="mt-1.5 text-sm tabular-nums text-foreground">
              {waitlist === null
                ? "—"
                : L(`${waitlist} people`, `${waitlist} 人`, `${waitlist} 人`)}
            </p>
          </div>
          <div className="flex items-end sm:justify-end">
            <a
              href="#weekly"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              {L("See how it works", "了解匹配机制", "了解配對機制")}
              <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return { d: pad(d), h: pad(h), m: pad(m), s: pad(s) };
}

function nextWednesday() {
  // Match Day is Wednesday 19:00 Asia/Shanghai (UTC+8) == 11:00 UTC.
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntil = (3 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntil);
  next.setUTCHours(11, 0, 0, 0);
  return next;
}

function WeeklyDate() {
  const { lang, t } = useLang();
  const target = nextWednesday();
  const { d, h, m, s } = useCountdown(target);
  const dateLabel = target.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const now = new Date();
  const isMatchDay = now.getUTCDay() === 3 && now.getUTCHours() < 11;
  return (
    <section
      id="weekly"
      className="relative overflow-hidden border-b border-border/60 bg-secondary/30"
    >
      <div
        className="absolute inset-0 -z-10 opacity-40"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, oklch(0.85 0.17 90 / 0.18), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24 md:py-32">
        <div className="grid items-center gap-14 sm:gap-12 md:grid-cols-2">
          <div data-reveal>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              {t("weekly_kicker")}
            </p>
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
                {lang === "zh"
                  ? "今天就是匹配日！你的专属匹配已就绪。"
                  : "Match Day is here! Your curated match is ready."}
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
                      <span className="mt-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        {c.l}
                      </span>
                    </div>
                    {i < 3 && <span className="pb-6 text-muted-foreground/40">:</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-1 text-sm text-muted-foreground">
              <p>
                {t("weekly_next")} <span className="text-foreground">{dateLabel}</span>
              </p>
              <p>
                {t("weekly_joined")}{" "}
                <span className="text-foreground">{t("weekly_joined_value")}</span>
              </p>
            </div>
          </div>

          <div
            data-reveal
            style={{ "--reveal-delay": "140ms" } as React.CSSProperties}
            className="relative mx-auto flex h-[420px] w-full max-w-md items-center justify-center md:h-[480px]"
          >
            <div
              className="absolute inset-0 -z-10 blur-3xl opacity-50"
              style={{
                background:
                  "radial-gradient(40% 40% at 50% 50%, oklch(0.85 0.17 90 / 0.35), transparent 70%)",
              }}
            />
            <figure className="polaroid -rotate-3 w-[240px] md:w-[280px]">
              <MomentsImg
                base="moment-2"
                alt="Weekly match meet-up"
                className="aspect-[4/5] w-full object-cover"
              />
              <figcaption className="mt-3 px-1 text-left">
                <div
                  className="text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: "oklch(0.45 0.03 260)" }}
                >
                  Match Day · Wed
                </div>
                <div className="mt-1 text-sm font-medium" style={{ color: "oklch(0.2 0.03 260)" }}>
                  示例场景 · 非真实用户
                </div>
              </figcaption>
            </figure>
            <figure className="polaroid rotate-6 absolute right-2 top-8 w-[170px] md:w-[200px]">
              <MomentsImg
                base="moment-5"
                alt="Weekly match meet-up"
                className="aspect-square w-full object-cover"
              />
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

function SendRealYou() {
  const { t } = useLang();
  return (
    <section id="send" className="relative overflow-hidden border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
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

          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="/auth"
              className="group inline-flex h-14 w-full max-w-sm items-center justify-center gap-3 rounded-full bg-primary pl-3 pr-6 text-base font-semibold text-primary-foreground shadow-[0_20px_60px_-12px_oklch(0.85_0.17_90/0.65),0_0_0_1px_oklch(0.85_0.17_90/0.4),inset_0_1px_0_oklch(1_0_0/0.35)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_28px_80px_-12px_oklch(0.85_0.17_90/0.8),0_0_0_1px_oklch(0.85_0.17_90/0.6),inset_0_1px_0_oklch(1_0_0/0.45)] sm:w-auto"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground">
                <MessageCircle className="h-5 w-5" />
              </span>
              {t("nav_getStarted")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
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
        <div className="max-w-2xl" data-reveal>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("values_kicker")}
          </p>
          <h2 className="mt-4 text-[1.75rem] sm:text-3xl font-semibold leading-[1.2] tracking-tight md:text-5xl">
            {t("values_title")}
          </h2>
        </div>
        <div className="mt-12 sm:mt-16 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-3">
          {values.map((v, i) => (
            <div
              key={i}
              data-reveal
              style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
              className="bg-background p-7 sm:p-8 md:p-10"
            >
              <div className="text-sm font-medium text-primary">0{i + 1}</div>
              <h3 className="mt-5 sm:mt-6 text-lg sm:text-xl font-semibold leading-snug tracking-tight">
                {v.title}
              </h3>
              <p className="mt-3 sm:mt-4 text-[15px] leading-[1.7] text-muted-foreground sm:text-sm sm:leading-relaxed">
                {v.body}
              </p>
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
        <div className="max-w-2xl" data-reveal>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("how_kicker")}
          </p>
          <h2 className="mt-4 text-[1.75rem] sm:text-3xl font-semibold leading-[1.2] tracking-tight md:text-5xl">
            {t("how_title")}
          </h2>
        </div>
        <div className="mt-12 sm:mt-16 grid gap-10 sm:gap-12 md:grid-cols-4 md:gap-8">
          {steps.map((s, i) => (
            <div
              key={s.n}
              data-reveal
              style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
            >
              <div className="text-sm font-medium text-primary">{s.n}</div>
              <div className="mt-4 h-px w-full bg-border" />
              <h3 className="mt-5 sm:mt-6 text-lg font-semibold leading-snug tracking-tight">
                {s.title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground sm:text-sm sm:leading-relaxed">
                {s.body}
              </p>
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
        <div className="max-w-2xl" data-reveal>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("compare_kicker")}
          </p>
          <h2 className="mt-4 text-[1.75rem] sm:text-3xl font-semibold leading-[1.2] tracking-tight md:text-5xl">
            {t("compare_title")}
          </h2>
        </div>
        <div
          data-reveal
          style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
          className="mt-12 sm:mt-16 overflow-x-auto overflow-hidden rounded-sm border border-border"
        >
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
        <div className="max-w-2xl" data-reveal>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("trust_kicker")}
          </p>
          <h2 className="mt-4 text-[1.75rem] sm:text-3xl font-semibold leading-[1.2] tracking-tight md:text-5xl">
            {t("trust_title")}
          </h2>
        </div>
        <div className="mt-12 sm:mt-16 grid gap-8 sm:gap-10 md:grid-cols-3">
          {trust.map((t, i) => (
            <div
              key={i}
              data-reveal
              style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
              className="border-t border-foreground pt-6"
            >
              <h3 className="text-lg font-semibold leading-snug tracking-tight">{t.title}</h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-muted-foreground sm:text-sm sm:leading-relaxed">
                {t.body}
              </p>
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
      <div
        className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-6 sm:py-28 md:py-40"
        data-reveal
      >
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
  // 6 moments. The base identifier maps 1:1 with our momentsI18n[lang]
  // array; we render each twice in a marquee loop for visual density.
  const bases = ["moment-1", "moment-2", "moment-3", "moment-4", "moment-5", "moment-6"] as const;
  const rotates = ["-rotate-3", "rotate-2", "-rotate-2", "rotate-1", "-rotate-1", "rotate-3"];
  const moments = momentsI18n[lang].map((m, i) => ({ ...m, base: bases[i]!, rotate: rotates[i]! }));
  const loop = [...moments, ...moments];
  return (
    <section id="moments" className="border-b border-border/60">
      <div className="py-20 sm:py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 max-w-2xl" data-reveal>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("moments_kicker")}
          </p>
          <h2 className="mt-4 text-[1.75rem] sm:text-3xl font-semibold leading-[1.2] tracking-tight md:text-5xl">
            <span className="font-display text-gold-glow">{t("moments_title1")}</span>{" "}
            {t("moments_title2")}
          </h2>
          <p className="mt-4 text-[15px] leading-[1.7] text-muted-foreground sm:text-sm sm:leading-relaxed md:text-base">
            {t("moments_desc")}
          </p>
        </div>
        <div
          className="marquee-wrap mt-16 overflow-hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          }}
        >
          <div className="marquee px-6">
            {loop.map((m, i) => (
              <figure key={i} className={`polaroid ${m.rotate} w-[220px] shrink-0 md:w-[260px]`}>
                <div
                  className="flex aspect-square w-full flex-col items-center justify-center gap-2 p-4"
                  style={{
                    background:
                      "linear-gradient(160deg, oklch(0.96 0.03 90), oklch(0.9 0.04 260))",
                  }}
                >
                  <div
                    className="text-[10px] font-medium uppercase tracking-[0.2em]"
                    style={{ color: "oklch(0.5 0.03 260)" }}
                  >
                    {lang === "zh" ? "共鸣" : lang === "yue" ? "共鳴" : "Resonance"}
                  </div>
                  <div
                    className="font-display text-6xl leading-none"
                    style={{ color: "oklch(0.35 0.08 260)" }}
                  >
                    {m.score}
                  </div>
                </div>
                <figcaption className="mt-3 px-1 text-left">
                  <div
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: "oklch(0.45 0.03 260)" }}
                  >
                    {m.tag}
                  </div>
                  <div
                    className="mt-1 text-sm font-medium"
                    style={{ color: "oklch(0.2 0.03 260)" }}
                  >
                    {m.name}
                  </div>
                  <p
                    className="mt-1 text-xs leading-snug"
                    style={{ color: "oklch(0.35 0.03 260)" }}
                  >
                    "{m.quote}"
                  </p>
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
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("footer_product")}
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <a
                    href="#values"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t("nav_why")}
                  </a>
                </li>
                <li>
                  <a
                    href="#how"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t("nav_how")}
                  </a>
                </li>
                <li>
                  <a
                    href="#moments"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t("nav_moments")}
                  </a>
                </li>
                <li>
                  <a
                    href="#compare"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t("nav_compare")}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("footer_resources")}
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <a
                    href="mailto:zhangcheng0688@gmail.com?subject=linQ%20Careers"
                    className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t("footer_careers")} <ArrowRight className="h-3 w-3 -rotate-45" />
                  </a>
                </li>
                <li>
                  <Link
                    to="/manifesto"
                    className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t("footer_manifesto")} <ArrowRight className="h-3 w-3 -rotate-45" />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/for-restaurants"
                    className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t("footer_restaurants")} <ArrowRight className="h-3 w-3 -rotate-45" />
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:zhangcheng0688@gmail.com?subject=linQ%20Press%20Kit"
                    className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t("footer_press")} <ArrowRight className="h-3 w-3 -rotate-45" />
                  </a>
                </li>
                <li>
                  <Link
                    to="/blog"
                    className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t("footer_blog")} <ArrowRight className="h-3 w-3 -rotate-45" />
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("footer_support")}
              </p>
              <ul className="mt-5 space-y-3 text-sm">
                <li className="flex items-center gap-2 text-foreground/80">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  {t("footer_chat")}
                </li>
                <li>
                  <a
                    href="mailto:zhangcheng0688@gmail.com?subject=linQ%20Support"
                    className="inline-flex items-center gap-1.5 text-foreground/80 transition-colors hover:text-primary"
                  >
                    <Mail className="h-3.5 w-3.5" /> [email protected]
                  </a>
                </li>
                <li>
                  <Link
                    to="/trust"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t("footer_trust")}
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:zhangcheng0688@gmail.com?subject=linQ%20Help"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t("footer_help")}
                  </a>
                </li>
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
                  <>
                    {t("footer_news_join")} <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
            {msg && (
              <p
                className={`mt-2 text-xs ${state === "success" ? "text-primary" : "text-destructive"}`}
              >
                {msg}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <a
              href="mailto:zhangcheng0688@gmail.com"
              aria-label="Email linQ"
              className="transition-colors hover:text-primary"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
          <p>
            © {new Date().getFullYear()} {t("footer_copy")}
          </p>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="transition-colors hover:text-primary">
              {t("footer_terms")}
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-primary">
              {t("footer_privacy")}
            </Link>
            <Link to="/cookies" className="transition-colors hover:text-primary">
              {t("footer_cookies")}
            </Link>
            <Link to="/dpa" className="transition-colors hover:text-primary">
              {t("footer_dpa")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Index() {
  useReveal();
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="aurora" aria-hidden="true">
          <div className="aurora-extra" />
          <div className="aurora-extra-2" />
          <div className="aurora-extra-3" />
        </div>
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
