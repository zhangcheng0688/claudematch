import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Copy, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { authedFetch } from "@/lib/api/authed-fetch";
import { PlanCard } from "@/components/shared/PlanCard";
import type { MatchRow, MeetPlan } from "@/types/match";

export const Route = createFileRoute("/_authenticated/match/$id")({
  head: () => ({
    meta: [
      { title: "Match details — linQ" },
      { name: "description", content: "Your AI match and meet-up plan." },
    ],
  }),
  component: () => (
    <LanguageProvider>
      <MatchDetailPage />
    </LanguageProvider>
  ),
});

function MatchDetailPage() {
  const { lang } = useLang();
  const t = (en: string, zh: string, yue: string) =>
    lang === "yue" ? yue : lang === "zh" ? zh : en;
  const { id } = Route.useParams();

  const [match, setMatch] = useState<MatchRow | null>(null);
  const [plan, setPlan] = useState<MeetPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"text" | "ics" | null>(null);
  const [showFullSummary, setShowFullSummary] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch<{ data: { match: MatchRow; plan: MeetPlan | null } }>(
          `/api/match/${id}`,
          { method: "GET" },
        );
        setMatch(res.data.match);
        setPlan(res.data.plan);
        setLoading(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
        setLoading(false);
      }
    })();
  }, [id]);

  const generatePlan = async () => {
    setErr(null);
    setGenerating(true);
    try {
      const res = await authedFetch<{ data: MeetPlan }>("/api/ai/meet-plan", {
        method: "POST",
        body: JSON.stringify({ match_id: id, lang }),
      });
      setPlan(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  };

  const copyPlanText = async () => {
    if (!plan) return;
    const text = renderPlanText(plan, lang);
    try {
      await navigator.clipboard.writeText(text);
      setCopied("text");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore
    }
  };

  const downloadIcs = () => {
    if (!plan) return;
    const ics = renderIcs(plan, match?.details?.name ?? "Match");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "linQ-meetup.ics";
    a.click();
    URL.revokeObjectURL(url);
    setCopied("ics");
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-6 py-20 text-center text-sm text-muted-foreground">
          {t("Loading…", "加载中…", "載入中…")}
        </div>
      </AppShell>
    );
  }

  if (err || !match) {
    return (
      <AppShell back={{ to: "/match", labelEn: "Back to matches", labelZh: "返回匹配列表", labelYue: "返回配對列表" }}>
        <div className="mx-auto max-w-md px-6 py-20 space-y-3">
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {err ?? t("Match not found.", "未找到匹配。", "搵唔到配對。")}
          </div>
          <Link
            to="/match"
            className="inline-flex h-9 items-center rounded-sm border border-border bg-background px-4 text-xs font-medium hover:bg-accent"
          >
            ← {t("Back to matches", "返回匹配列表", "返回配對列表")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const d = match.details ?? {};
  const summary = d.summary ?? d.bio ?? "";
  const showSummaryExpand = summary.length > 150;

  return (
    <AppShell back={{ to: "/match", labelEn: "Back to matches", labelZh: "返回匹配列表", labelYue: "返回配對列表" }}>
      <section className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/30">
            <div>
              <div className="text-4xl font-semibold text-gold-glow tabular-nums">
                {match.match_score.toFixed(1)}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {t("Match Score", "匹配度", "配對分")}
              </div>
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className="text-gold-glow">{d.name ?? t("Match", "匹配对象", "配對對象")}</span>
            {d.age && <span className="ml-2 text-base font-normal text-muted-foreground">{d.age}</span>}
            {d.city && <span className="ml-1 text-base font-normal text-muted-foreground">· {d.city}</span>}
          </h1>
          {d.headline && <p className="mt-1 text-sm text-muted-foreground">{d.headline}</p>}
        </div>

        {(summary || (d.shared_interests && d.shared_interests.length > 0)) && (
          <div className="mt-10 overflow-hidden rounded-sm border border-border bg-background/40 p-6">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("About the match", "关于这次匹配", "關於呢次配對")}
            </div>
            {summary && (
              <div className="mt-3">
                <p
                  className="text-sm leading-relaxed text-foreground/90"
                  style={
                    !showFullSummary && showSummaryExpand
                      ? {
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }
                      : undefined
                  }
                >
                  {summary}
                </p>
                {showSummaryExpand && (
                  <button
                    onClick={() => setShowFullSummary((v) => !v)}
                    className="mt-1 text-xs text-primary hover:underline"
                  >
                    {showFullSummary ? t("Collapse", "收起", "收埋") : t("Show more", "展开更多", "展開更多")}
                  </button>
                )}
              </div>
            )}
            {d.shared_interests && d.shared_interests.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {d.shared_interests.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            {d.reason && (
              <p className="mt-4 rounded-sm border-l-2 border-primary/60 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-primary">{t("Why", "为何匹配", "點解配")}: </span>
                {d.reason}
              </p>
            )}
          </div>
        )}

        <div className="mt-10">
          {plan ? (
            <>
              <PlanCard plan={plan} match={match} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={copyPlanText}
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-border bg-background px-4 text-xs font-medium hover:bg-accent"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === "text" ? t("Copied!", "已复制!", "複製咗!") : t("Copy plan", "复制方案", "複製方案")}
                </button>
                <button
                  onClick={downloadIcs}
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-border bg-background px-4 text-xs font-medium hover:bg-accent"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {copied === "ics" ? t("Downloaded ✓", "已下载 ✓", "下載咗 ✓") : t("Add to calendar (.ics)", "加入日历", "加入日曆")}
                </button>
                <button
                  onClick={generatePlan}
                  disabled={generating}
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {generating ? t("Regenerating…", "重新生成中…", "重新整理緊…") : t("Regenerate", "重新生成", "重新整理")}
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={generatePlan}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-4 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? t("AI is drafting your plan…", "AI 正在生成方案…", "AI 寫緊方案…") : t("Plan a meet-up", "生成见面方案", "整個見面方案")}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {err && (
          <div className="mt-6 rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {err}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function renderPlanText(plan: MeetPlan, lang: "en" | "zh" | "yue"): string {
  const p = plan.plan_content?.ai ?? {};
  const scenario = plan.plan_content?.scenario ?? "";
  const titleMap: Record<string, { en: string; zh: string; yue: string }> = {
    dating: { en: "Dating", zh: "恋爱", yue: "拍拖" },
    business: { en: "Business", zh: "工作", yue: "工作" },
    partner: { en: "Local friends", zh: "本地朋友", yue: "本地朋友" },
  };
  const title = titleMap[scenario]?.[lang] ?? scenario;
  const labels: Record<"en" | "zh" | "yue", { w: string; wt: string; d: string; dc: string; b: string }> = {
    en: { w: "When", wt: "Where", d: "Duration", dc: "Dress code", b: "Budget" },
    zh: { w: "时间", wt: "地点", d: "时长", dc: "着装", b: "人均消费" },
    yue: { w: "時間", wt: "地點", d: "時長", dc: "著裝", b: "人均消費" },
  };
  const L = labels[lang];
  return [
    `【linQ】${title} 见面方案`,
    ``,
    `⏰ ${L.w}: ${p.when ?? "TBD"}`,
    `📍 ${L.wt}: ${p.where ?? "TBD"}${p.location_intro ? ` (${p.location_intro})` : ""}`,
    p.duration ? `🕐 ${L.d}: ${p.duration}` : "",
    p.dress_code ? `👔 ${L.dc}: ${p.dress_code}` : "",
    p.budget ? `💰 ${L.b}: ${p.budget}` : "",
    ``,
    p.icebreakers && p.icebreakers.length
      ? `💬 Icebreakers:\n${p.icebreakers.map((q, i) => `  ${i + 1}. ${q}`).join("\n")}`
      : "",
    p.pitfalls && p.pitfalls.length
      ? `\n⚠️ Pitfalls:\n${p.pitfalls.map((q, i) => `  · ${q}`).join("\n")}`
      : "",
    p.highlights && p.highlights.length
      ? `\n★ Highlights:\n${p.highlights.map((q, i) => `  · ${q}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderIcs(plan: MeetPlan, summary: string): string {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(19, 0, 0, 0);
  const end = new Date(start);
  end.setUTCMinutes(end.getUTCMinutes() + 75);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const uid = `linq-${plan.id}-${start.getTime()}@claudematch.com`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//linQ//Meet-up//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:linQ meet-up with ${summary}`,
    "DESCRIPTION:Generated by linQ AI. See email or app for full details.",
    "LOCATION:See app",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
