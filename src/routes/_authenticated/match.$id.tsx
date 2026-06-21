import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Copy, Loader2, Sparkles, ArrowRight, ChevronDown } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { authedFetch } from "@/lib/api/authed-fetch";
import { PlanCard } from "@/components/shared/PlanCard";
import { RadarChart } from "@/components/shared/RadarChart";
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
  const [matchRating, setMatchRating] = useState<number | null>(null);
  const [meetRating, setMeetRating] = useState<number | null>(null);
  const [meetDidMeet, setMeetDidMeet] = useState<boolean | null>(null);
  const [meetComment, setMeetComment] = useState("");
  const [meetFeedbackSubmitting, setMeetFeedbackSubmitting] = useState(false);
  const [meetFeedbackSubmitted, setMeetFeedbackSubmitted] = useState(false);
  const [reported, setReported] = useState(false);
  const [matchFeedbackComment, setMatchFeedbackComment] = useState("");
  const [matchFeedbackSubmitting, setMatchFeedbackSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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
      <AppShell
        back={{
          to: "/match",
          labelEn: "Back to matches",
          labelZh: "返回匹配列表",
          labelYue: "返回配對列表",
        }}
      >
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
    <AppShell
      back={{
        to: "/match",
        labelEn: "Back to matches",
        labelZh: "返回匹配列表",
        labelYue: "返回配對列表",
      }}
    >
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
            {d.age && (
              <span className="ml-2 text-base font-normal text-muted-foreground">{d.age}</span>
            )}
            {d.city && (
              <span className="ml-1 text-base font-normal text-muted-foreground">· {d.city}</span>
            )}
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
                    {showFullSummary
                      ? t("Collapse", "收起", "收埋")
                      : t("Show more", "展开更多", "展開更多")}
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
                  {copied === "text"
                    ? t("Copied!", "已复制!", "複製咗!")
                    : t("Copy plan", "复制方案", "複製方案")}
                </button>
                <button
                  onClick={downloadIcs}
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-border bg-background px-4 text-xs font-medium hover:bg-accent"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {copied === "ics"
                    ? t("Downloaded ✓", "已下载 ✓", "下載咗 ✓")
                    : t("Add to calendar (.ics)", "加入日历", "加入日曆")}
                </button>
                <button
                  onClick={generatePlan}
                  disabled={generating}
                  className="inline-flex h-10 items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {generating
                    ? t("Regenerating…", "重新生成中…", "重新整理緊…")
                    : t("Regenerate", "重新生成", "重新整理")}
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={generatePlan}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-4 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating
                ? t("AI is drafting your plan…", "AI 正在生成方案…", "AI 寫緊方案…")
                : t("Plan a meet-up", "生成见面方案", "整個見面方案")}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        <MatchAnalysis
          details={d}
          lang={lang}
          t={t}
          expanded={expandedSections}
          toggle={(key) => setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))}
        />

        {plan && !meetFeedbackSubmitted && isMeetFeedbackDue(plan) && (
          <div className="mt-10 rounded-sm border border-primary/30 bg-primary/5 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              {t("How did the meet-up go?", "见面进行得怎么样？", "見面進行得點樣？")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "Your real feedback makes linQ's matching better.",
                "你的真实反馈会让 linQ 的匹配越来越准。",
                "你真實嘅反饋會令 linQ 嘅配對越嚟越準。",
              )}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMeetDidMeet(true)}
                className={`rounded-sm border px-3 py-1.5 text-xs ${meetDidMeet === true ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground"}`}
              >
                {t("We met", "见面了", "見咗面")}
              </button>
              <button
                type="button"
                onClick={() => setMeetDidMeet(false)}
                className={`rounded-sm border px-3 py-1.5 text-xs ${meetDidMeet === false ? "border-primary bg-primary/20 text-primary" : "border-border text-muted-foreground"}`}
              >
                {t("Didn't meet", "没见面", "無見面")}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setMeetRating(star)}
                  disabled={meetFeedbackSubmitting}
                  className={`text-xl transition-colors ${
                    (meetRating ?? 0) >= star
                      ? "text-gold-glow"
                      : "text-muted-foreground/30 hover:text-gold-glow/70"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={meetComment}
              onChange={(e) => setMeetComment(e.target.value)}
              rows={2}
              maxLength={400}
              placeholder={t(
                "What worked or didn't? (optional)",
                "哪里好、哪里不好？（可选）",
                "邊度好、邊度唔好？（可選）",
              )}
              className="mt-3 w-full rounded-sm border border-border bg-background/60 p-3 text-xs leading-relaxed outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={async () => {
                if (meetRating === null || meetDidMeet === null || !match || !plan) return;
                setMeetFeedbackSubmitting(true);
                try {
                  await authedFetch("/api/feedback/meet", {
                    method: "POST",
                    body: JSON.stringify({
                      match_id: match.id,
                      meet_plan_id: plan.id,
                      rating: meetRating,
                      did_meet: meetDidMeet,
                      comment: meetComment,
                    }),
                  });
                  setMeetFeedbackSubmitted(true);
                } catch {
                  /* best-effort */
                } finally {
                  setMeetFeedbackSubmitting(false);
                }
              }}
              disabled={meetFeedbackSubmitting || meetRating === null || meetDidMeet === null}
              className="mt-3 inline-flex h-8 items-center rounded-sm bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {meetFeedbackSubmitting
                ? t("Submitting…", "提交中…", "提交緊…")
                : t("Submit feedback", "提交反馈", "提交反饋")}
            </button>
          </div>
        )}

        <div className="mt-10 rounded-sm border border-border bg-background/40 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("How accurate is this match?", "这次匹配准不准？", "呢次配對準唔準？")}
          </p>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setMatchRating(star)}
                disabled={matchFeedbackSubmitting}
                className={`text-xl transition-colors ${
                  (matchRating ?? 0) >= star
                    ? "text-gold-glow"
                    : "text-muted-foreground/30 hover:text-gold-glow/70"
                }`}
                aria-label={t(`${star} star`, `${star} 星`, `${star} 星`)}
              >
                ★
              </button>
            ))}
          </div>
          {matchRating !== null && (
            <div className="mt-3 space-y-3">
              <textarea
                value={matchFeedbackComment}
                onChange={(e) => setMatchFeedbackComment(e.target.value)}
                rows={2}
                maxLength={400}
                placeholder={t(
                  "What feels right or wrong? (optional)",
                  "哪里对、哪里不对？（可选）",
                  "邊度啱、邊度唔啱？（可選）",
                )}
                className="w-full rounded-sm border border-border bg-background/60 p-3 text-xs leading-relaxed outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={async () => {
                  if (matchRating === null || !match) return;
                  setMatchFeedbackSubmitting(true);
                  try {
                    await authedFetch("/api/feedback/quality", {
                      method: "POST",
                      body: JSON.stringify({
                        kind: "match",
                        target_id: match.id,
                        scenario: match.scenario,
                        rating: matchRating,
                        comment: matchFeedbackComment,
                        prompt_version: match.details?.prompt_version,
                      }),
                    });
                  } catch {
                    /* best-effort */
                  } finally {
                    setMatchFeedbackSubmitting(false);
                  }
                }}
                disabled={matchFeedbackSubmitting}
                className="inline-flex h-8 items-center rounded-sm bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {matchFeedbackSubmitting
                  ? t("Submitting…", "提交中…", "提交緊…")
                  : t("Submit feedback", "提交反馈", "提交反饋")}
              </button>
            </div>
          )}
        </div>

        {match.matched_user_id && !reported && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={async () => {
                if (!match.matched_user_id) return;
                try {
                  await authedFetch("/api/feedback/report", {
                    method: "POST",
                    body: JSON.stringify({
                      reported_id: match.matched_user_id,
                      match_id: match.id,
                      reason: "User reported from match detail",
                    }),
                  });
                  setReported(true);
                } catch {
                  /* best-effort */
                }
              }}
              className="text-xs text-muted-foreground underline hover:text-destructive"
            >
              {t("Report / Block", "举报 / 屏蔽", "舉報 / 封鎖")}
            </button>
          </div>
        )}
        {reported && (
          <p className="mt-4 text-right text-xs text-muted-foreground">
            {t("Reported. We will review it.", "已举报，我们会处理。", "已舉報，我哋會處理。")}
          </p>
        )}

        {err && (
          <div className="mt-6 rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {err}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Section({
  title,
  children,
  open,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-sm border border-border bg-background/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

function MatchAnalysis({
  details,
  lang,
  t,
  expanded,
  toggle,
}: {
  details: MatchRow["details"];
  lang: "en" | "zh" | "yue";
  t: (en: string, zh: string, yue: string) => string;
  expanded: Record<string, boolean>;
  toggle: (key: string) => void;
}) {
  const d = details;
  const breakdown = d.compatibility_breakdown;
  const radarData = breakdown
    ? [
        { label: t("Resonance", "共鸣", "共鳴"), fullMark: 100, score: breakdown.resonance ?? 0 },
        {
          label: t("Complement", "互补", "互補"),
          fullMark: 100,
          score: breakdown.complementarity ?? 0,
        },
        {
          label: t("Chemistry", "化学反应", "化學反應"),
          fullMark: 100,
          score: breakdown.chemistry ?? 0,
        },
        {
          label: t("Growth", "成长", "成長"),
          fullMark: 100,
          score: breakdown.growth_potential ?? 0,
        },
        {
          label: t("Friction", "摩擦风险", "摩擦風險"),
          fullMark: 100,
          score: breakdown.friction_risk ?? 0,
        },
      ]
    : [];

  const hasEquation = Boolean(d.compatibility_equation);
  const hasParadox = Boolean(
    d.paradox_intersection &&
    (d.paradox_intersection.a_paradox || d.paradox_intersection.how_b_loosens),
  );
  const hasAttachment = Boolean(
    d.attachment_dance && (d.attachment_dance.a_style || d.attachment_dance.b_style),
  );
  const hasResonance = Array.isArray(d.resonance) && d.resonance.length > 0;
  const hasComplementarity = Array.isArray(d.complementarity) && d.complementarity.length > 0;
  const hasFriction = Array.isArray(d.friction) && d.friction.length > 0;
  const hasChemistry = Boolean(d.chemistry?.first_10_minutes || d.chemistry?.the_unspoken);
  const hasGrowth = Boolean(d.growth?.in_6_months || d.growth?.the_third_thing);
  const hasTimeline = Array.isArray(d.timeline) && d.timeline.length > 0;
  const hasArc = Boolean(d.conversation_arc?.opening);
  const hasFollowUp = Boolean(d.follow_up_strategy?.day_1);
  const hasLongTerm = Boolean(
    d.long_term_health?.a_must_adjust || d.long_term_health?.b_must_adjust,
  );

  if (
    !hasEquation &&
    !hasParadox &&
    !hasAttachment &&
    !hasResonance &&
    !hasComplementarity &&
    !hasFriction &&
    !hasChemistry &&
    !hasGrowth &&
    !breakdown &&
    !hasTimeline &&
    !hasArc &&
    !hasFollowUp &&
    !hasLongTerm
  ) {
    return null;
  }

  return (
    <div className="mt-10 space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">
        <span className="text-gold-glow">
          {t("AI relationship analysis", "AI 关系分析", "AI 關係分析")}
        </span>
      </h3>

      {hasEquation && (
        <div className="rounded-sm border border-primary/30 bg-primary/5 p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("Why these two", "为什么是你们两个", "點解係你哋兩個")}
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-foreground/95">
            {d.compatibility_equation}
          </p>
        </div>
      )}

      {breakdown && (
        <div className="rounded-sm border border-border bg-background/40 p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("Compatibility breakdown", "五维匹配度", "五維匹配度")}
          </p>
          <RadarChart data={radarData} />
        </div>
      )}

      {hasParadox && (
        <Section
          title={t("Paradox & resolution", "矛盾与松动", "矛盾同鬆動")}
          open={!!expanded.paradox}
          onToggle={() => toggle("paradox")}
        >
          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              <span className="text-muted-foreground">
                {t("A's paradox:", "A 的矛盾：", "A 嘅矛盾：")}
              </span>{" "}
              {d.paradox_intersection?.a_paradox}
            </p>
            <p>
              <span className="text-muted-foreground">
                {t("How B loosens it:", "B 怎么让它松动：", "B 點樣令佢鬆動：")}
              </span>{" "}
              {d.paradox_intersection?.how_b_loosens}
            </p>
            {d.paradox_intersection?.risk && (
              <p>
                <span className="text-muted-foreground">{t("Risk:", "风险：", "風險：")}</span>{" "}
                {d.paradox_intersection.risk}
              </p>
            )}
          </div>
        </Section>
      )}

      {hasAttachment && (
        <Section
          title={t("Attachment dance", "依恋模式", "依戀模式")}
          open={!!expanded.attachment}
          onToggle={() => toggle("attachment")}
        >
          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              <span className="text-muted-foreground">{t("A:", "A：", "A：")}</span>{" "}
              {d.attachment_dance?.a_style}
            </p>
            <p>
              <span className="text-muted-foreground">{t("B:", "B：", "B：")}</span>{" "}
              {d.attachment_dance?.b_style}
            </p>
            <p>
              <span className="text-muted-foreground">
                {t("Why it works:", "为什么互相吸引：", "點解互相吸引：")}
              </span>{" "}
              {d.attachment_dance?.why_it_works}
            </p>
            {d.attachment_dance?.landmine && (
              <p>
                <span className="text-rose-400/80">{t("Landmine:", "雷区：", "雷區：")}</span>{" "}
                {d.attachment_dance.landmine}
              </p>
            )}
          </div>
        </Section>
      )}

      {hasResonance && (
        <Section
          title={t("Resonance", "共鸣点", "共鳴點")}
          open={!!expanded.resonance}
          onToggle={() => toggle("resonance")}
        >
          <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-foreground/90">
            {d.resonance!.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Section>
      )}

      {hasComplementarity && (
        <Section
          title={t("Complementarity", "互补点", "互補點")}
          open={!!expanded.complementarity}
          onToggle={() => toggle("complementarity")}
        >
          <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-foreground/90">
            {d.complementarity!.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Section>
      )}

      {hasFriction && (
        <Section
          title={t("Friction", "摩擦点", "摩擦點")}
          open={!!expanded.friction}
          onToggle={() => toggle("friction")}
        >
          <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-foreground/90">
            {d.friction!.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Section>
      )}

      {hasChemistry && (
        <Section
          title={t("First 10 minutes", "头 10 分钟", "頭 10 分鐘")}
          open={!!expanded.chemistry}
          onToggle={() => toggle("chemistry")}
        >
          <div className="space-y-3 text-sm leading-relaxed">
            {d.chemistry?.first_10_minutes && <p>{d.chemistry.first_10_minutes}</p>}
            {d.chemistry?.the_unspoken && (
              <p className="text-muted-foreground">
                {t("Unspoken:", "没说出口：", "無講出口：")} {d.chemistry.the_unspoken}
              </p>
            )}
          </div>
        </Section>
      )}

      {hasGrowth && (
        <Section
          title={t("Growth", "成长", "成長")}
          open={!!expanded.growth}
          onToggle={() => toggle("growth")}
        >
          <div className="space-y-3 text-sm leading-relaxed">
            {d.growth?.in_6_months && <p>{d.growth.in_6_months}</p>}
            {d.growth?.the_third_thing && (
              <p className="text-muted-foreground">
                {t("The third thing:", "第三个东西：", "第三樣嘢：")} {d.growth.the_third_thing}
              </p>
            )}
          </div>
        </Section>
      )}

      {hasTimeline && (
        <Section
          title={t("Relationship timeline", "关系时间线", "關係時間線")}
          open={!!expanded.timeline}
          onToggle={() => toggle("timeline")}
        >
          <div className="space-y-4">
            {d.timeline!.map((pt, i) => (
              <div key={i} className="border-l-2 border-primary/30 pl-4">
                <p className="text-xs font-medium uppercase tracking-wider text-primary">
                  {pt.phase.replace("_", " ")}
                </p>
                <p className="mt-1 text-sm leading-relaxed">{pt.what_happens}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Watch for:", "关注信号：", "留意信號：")} {pt.signals_to_watch}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasArc && (
        <Section
          title={t("First meeting arc", "第一次见面流程", "第一次見面流程")}
          open={!!expanded.arc}
          onToggle={() => toggle("arc")}
        >
          <div className="space-y-3 text-sm leading-relaxed">
            {d.conversation_arc?.opening && (
              <p>
                <span className="text-primary">0-5min:</span> {d.conversation_arc.opening}
              </p>
            )}
            {d.conversation_arc?.warming && (
              <p>
                <span className="text-primary">5-15min:</span> {d.conversation_arc.warming}
              </p>
            )}
            {d.conversation_arc?.depth && (
              <p>
                <span className="text-primary">15-25min:</span> {d.conversation_arc.depth}
              </p>
            )}
            {d.conversation_arc?.closing && (
              <p>
                <span className="text-primary">25-30min:</span> {d.conversation_arc.closing}
              </p>
            )}
          </div>
        </Section>
      )}

      {hasFollowUp && (
        <Section
          title={t("Follow-up strategy", "后续策略", "後續策略")}
          open={!!expanded.followup}
          onToggle={() => toggle("followup")}
        >
          <div className="space-y-3 text-sm leading-relaxed">
            {d.follow_up_strategy?.day_1 && (
              <p>
                <span className="text-primary">Day 1:</span> {d.follow_up_strategy.day_1}
              </p>
            )}
            {d.follow_up_strategy?.week_1 && (
              <p>
                <span className="text-primary">Week 1:</span> {d.follow_up_strategy.week_1}
              </p>
            )}
            {d.follow_up_strategy?.month_1 && (
              <p>
                <span className="text-primary">Month 1:</span> {d.follow_up_strategy.month_1}
              </p>
            )}
          </div>
        </Section>
      )}

      {hasLongTerm && (
        <Section
          title={t("Long-term health", "长期健康", "長期健康")}
          open={!!expanded.health}
          onToggle={() => toggle("health")}
        >
          <div className="space-y-3 text-sm leading-relaxed">
            {d.long_term_health?.a_must_adjust && (
              <p>
                <span className="text-muted-foreground">
                  {t("A must adjust:", "A 需要调整：", "A 需要調整：")}
                </span>{" "}
                {d.long_term_health.a_must_adjust}
              </p>
            )}
            {d.long_term_health?.b_must_adjust && (
              <p>
                <span className="text-muted-foreground">
                  {t("B must adjust:", "B 需要调整：", "B 需要調整：")}
                </span>{" "}
                {d.long_term_health.b_must_adjust}
              </p>
            )}
            {d.long_term_health?.shared_practice && (
              <p>
                <span className="text-muted-foreground">
                  {t("Shared practice:", "共同习惯：", "共同習慣：")}
                </span>{" "}
                {d.long_term_health.shared_practice}
              </p>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function isMeetFeedbackDue(plan: MeetPlan): boolean {
  const generatedAt = plan.plan_content?.generated_at ?? plan.created_at;
  if (!generatedAt) return false;
  const hours = (Date.now() - new Date(generatedAt).getTime()) / (1000 * 60 * 60);
  return hours >= 24;
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
  const labels: Record<
    "en" | "zh" | "yue",
    { w: string; wt: string; d: string; dc: string; b: string }
  > = {
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
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");

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
