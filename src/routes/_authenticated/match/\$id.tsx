import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Copy, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
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

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body;
}

function MatchDetailPage() {
  const { lang } = useLang();
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);
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
        const res = await authedFetch(`/api/match/${id}`, { method: "GET" });
        const data = (res as { data: { match: MatchRow; plan: MeetPlan | null } }).data;
        setMatch(data.match);
        setPlan(data.plan);
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
      const res = await authedFetch("/api/ai/meet-plan", {
        method: "POST",
        body: JSON.stringify({ match_id: id, lang }),
      });
      setPlan((res as { data: MeetPlan }).data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setGenerating(false);
    }
  };

  const copyPlanText = async () => {
    if (!plan) return;
    const text = renderPlanText(plan);
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
      <CenterShell>
        <div className="rounded-sm border border-border bg-background/40 p-12 text-center text-sm text-muted-foreground">
          {t("Loading…", "加载中…")}
        </div>
      </CenterShell>
    );
  }

  if (err || !match) {
    return (
      <CenterShell>
        <div className="space-y-3">
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {err ?? t("Match not found.", "未找到匹配。")}
          </div>
          <Link
            to="/match"
            className="inline-flex h-9 items-center rounded-sm border border-border bg-background px-4 text-xs font-medium hover:bg-accent"
          >
            ← {t("Back to matches", "返回匹配列表")}
          </Link>
        </div>
      </CenterShell>
    );
  }

  const d = match.details ?? {};
  const summary = d.summary ?? d.bio ?? "";
  const showSummaryExpand = summary.length > 150;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <Link to="/match" className="text-xs text-muted-foreground hover:text-foreground">
            ← {t("Back to matches", "返回匹配列表")}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 ring-2 ring-primary/30">
            <div>
              <div className="text-4xl font-semibold text-gold-glow tabular-nums">
                {match.match_score.toFixed(1)}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {t("Match Score", "匹配度")}
              </div>
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className="text-gold-glow">{d.name ?? t("Match", "匹配对象")}</span>
            {d.age && <span className="ml-2 text-base font-normal text-muted-foreground">{d.age}</span>}
            {d.city && <span className="ml-1 text-base font-normal text-muted-foreground">· {d.city}</span>}
          </h1>
          {d.headline && <p className="mt-1 text-sm text-muted-foreground">{d.headline}</p>}
        </div>

        {(summary || (d.shared_interests && d.shared_interests.length > 0)) && (
          <div className="mt-10 overflow-hidden rounded-sm border border-border bg-background/40 p-6">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("About the match", "关于这次匹配")}
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
                    {showFullSummary ? t("Collapse", "收起") : t("Show more", "展开更多")}
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
                <span className="font-medium text-primary">{t("Why", "为何匹配")}: </span>
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
                  {copied === "text" ? t("Copied!", "已复制!") : t("Copy plan", "复制方案")}
                </button>
                <button
                  onClick={downloadIcs}
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-border bg-background px-4 text-xs font-medium hover:bg-accent"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {copied === "ics" ? t("Downloaded ✓", "已下载 ✓") : t("Add to calendar (.ics)", "加入日历")}
                </button>
                <button
                  onClick={generatePlan}
                  disabled={generating}
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {generating ? t("Regenerating…", "重新生成中…") : t("Regenerate", "重新生成")}
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
              {generating ? t("AI is drafting your plan…", "AI 正在生成方案…") : t("Plan a meet-up", "生成见面方案")}
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
    </main>
  );
}

function CenterShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <Link to="/match" className="text-xs text-muted-foreground hover:text-foreground">
            ← {`back`}
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-md px-6 py-20">{children}</section>
    </main>
  );
}

function renderPlanText(plan: MeetPlan): string {
  const p = plan.plan_content?.ai ?? {};
  return [
    `【linQ】${plan.plan_content?.scenario ?? ""} 见面方案`,
    ``,
    `⏰ When: ${p.when ?? "TBD"}`,
    `📍 Where: ${p.where ?? "TBD"}${p.location_intro ? ` (${p.location_intro})` : ""}`,
    p.duration ? `🕐 Duration: ${p.duration}` : "",
    p.dress_code ? `👔 Dress code: ${p.dress_code}` : "",
    p.budget ? `💰 Budget: ${p.budget}` : "",
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
