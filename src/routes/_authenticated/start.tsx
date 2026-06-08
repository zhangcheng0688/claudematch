import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { authedFetch } from "@/lib/api/authed-fetch";
import { MatchCard } from "@/components/shared/MatchCard";
import { PlanCard } from "@/components/shared/PlanCard";
import type { Scenario, Profile, MatchRow, MeetPlan } from "@/types/match";
import {
  ArrowRight,
  Briefcase,
  Heart,
  Users,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/start")({
  head: () => ({ meta: [{ title: "Start matching — linQ" }] }),
  component: () => (
    <LanguageProvider>
      <StartPage />
    </LanguageProvider>
  ),
});

function StartPage() {
  const { lang } = useLang();
  const t = (en: string, zh: string, yue: string) =>
    lang === "yue" ? yue : lang === "zh" ? zh : en;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scenario, setScenario] = useState<Scenario>("dating");
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [activeMatch, setActiveMatch] = useState<MatchRow | null>(null);
  const [plan, setPlan] = useState<MeetPlan | null>(null);
  const [loading, setLoading] = useState<null | "profile" | "match" | "plan">(null);
  const [err, setErr] = useState<string | null>(null);
  const [waitlistMsg, setWaitlistMsg] = useState<string | null>(null);

  const scenarios = useMemo(
    () => [
      { id: "business" as const, label: t("Business", "工作", "工作"), icon: Briefcase, desc: t("Co-founders, collaborators, mentors.", "合伙人、合作者、导师。", "Co-founder、合作拍檔、師傅。") },
      { id: "dating" as const, label: t("Dating", "恋爱", "拍拖"), icon: Heart, desc: t("Real chemistry, not endless swipes.", "真实的化学反应，告别无限左滑。", "真正嘅化學反應，唔係無止境嘅左掃。") },
      { id: "partner" as const, label: t("Local friends", "本地朋友", "本地朋友"), icon: Users, desc: t("Weekend partners, hobby buddies.", "周末搭子、兴趣伙伴。", "週末拍檔、興趣班底。") },
    ],
    [lang],
  );

  const generateProfile = async () => {
    setErr(null);
    if (input.trim().length < 12) {
      setErr(
        t(
          "Tell us a bit more — at least a couple of sentences.",
          "请多写一些，至少几句话。",
          "寫多啲啦，幾句都得啦。",
        ),
      );
      return;
    }
    setLoading("profile");
    try {
      const res = await authedFetch<{ data: Profile }>("/api/ai/generate-profile", {
        method: "POST",
        body: JSON.stringify({ input, scenario, lang }),
      });
      setProfile(res.data);
      setStep(2);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  const findMatches = async () => {
    setErr(null);
    setWaitlistMsg(null);
    setPlan(null);
    setActiveMatch(null);
    setMatches([]);
    setLoading("match");
    try {
      const res = await authedFetch<{
        data: MatchRow[];
        plan?: MeetPlan;
        waitlisted?: boolean;
        message?: string;
      }>("/api/ai/match", {
        method: "POST",
        body: JSON.stringify({ scenario, lang }),
      });
      setMatches(res.data ?? []);
      if (res.waitlisted) {
        setWaitlistMsg(res.message ?? t("暂无匹配，已加入等待池。", "暂无匹配，已加入等待池。", "暫無配對，已加入等候池。"));
      } else if (res.data?.[0]) {
        setActiveMatch(res.data[0]);
        if (res.plan) setPlan(res.plan);
      }
      setStep(3);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  const planMeet = async (m: MatchRow) => {
    setErr(null);
    setActiveMatch(m);
    setPlan(null);
    setLoading("plan");
    try {
      const res = await authedFetch<{ data: MeetPlan }>("/api/ai/meet-plan", {
        method: "POST",
        body: JSON.stringify({ match_id: m.id, lang }),
      });
      setPlan(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Stepper step={step} t={t} />

        {step === 1 && (
          <div className="mt-10 space-y-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="text-gold-glow">{t("Tell linQ about you", "告诉 linQ 你是谁", "同 linQ 講下你係邊個")}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                "Anything — your day, your obsessions, what you're looking for. AI turns it into your match profile.",
                "随便写——你的一天、你的爱好、你在找的人。AI 会把它变成你的匹配画像。",
                "隨意寫——你嘅一日、興趣、想搵咩嘅人。AI 會幫你整成配對畫像。",
              )}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {scenarios.map((s) => {
                const Icon = s.icon;
                const active = scenario === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScenario(s.id)}
                    className={`text-left rounded-sm border p-4 transition-all ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="mt-2 text-sm font-medium">{s.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{s.desc}</div>
                  </button>
                );
              })}
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={7}
              maxLength={2000}
              placeholder={t(
                "e.g. I'm a 29-year-old product designer in SF, into rock climbing and indie sci-fi. Looking for someone curious, kind, and a bit nerdy…",
                "比如：我是 29 岁的产品设计师，在上海，喜欢攀岩和独立科幻。希望遇到好奇、温柔、有点书呆子的人……",
                "例如：29 歲，喺香港做 product designer，鍾意行山同睇 indie 科幻。想搵個好奇、溫柔、書生氣嘅人……",
              )}
              className="w-full rounded-sm border border-border bg-background/60 p-4 text-sm leading-relaxed outline-none focus:border-primary"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{input.length}/2000</span>
              <button
                onClick={generateProfile}
                disabled={loading === "profile"}
                className="group inline-flex h-12 items-center gap-2 rounded-sm bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading === "profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t("Generate AI profile", "生成 AI 画像", "整 AI 檔案")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && profile && (
          <div className="mt-10 space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="text-gold-glow">{t("Your AI profile", "你的 AI 画像", "你嘅 AI 檔案")}</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("Looks good? Let AI find your top 3 matches.", "看起来对吗？让 AI 为你挑出 3 个最佳匹配。", "睇落 OK 嗎？等 AI 幫你搵 3 個最夾嘅人。")}
            </p>
            <ProfileCard
              profile={profile}
              t={t}
              onRegenerate={generateProfile}
              regenerating={loading === "profile"}
            />
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="text-xs text-muted-foreground hover:text-foreground">
                ← {t("Edit description", "重新描述", "重新描述")}
              </button>
              <button
                onClick={findMatches}
                disabled={loading === "match"}
                className="group inline-flex h-12 items-center gap-2 rounded-sm bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading === "match" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t("Find my matches", "开始匹配", "即刻配對")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-10 space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="text-gold-glow">{t("Your match", "你的匹配", "你嘅配對")}</span>
            </h2>
            {waitlistMsg ? (
              <div className="rounded-sm border border-primary/40 bg-primary/5 p-6 text-sm leading-relaxed">
                {waitlistMsg}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "linQ matched you 1:1. The meet-up plan is sent to both inboxes.",
                    "linQ 已为你完成 1 对 1 匹配，见面方案已同步发送至双方邮箱。",
                    "linQ 已經幫你完成 1 對 1 配對，見面方案已經 send 咗俾雙方。",
                  )}
                </p>
                <div className="space-y-4">
                  {matches.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      active={activeMatch?.id === m.id}
                      onPlan={() => planMeet(m)}
                      loading={loading === "plan" && activeMatch?.id === m.id}
                    />
                  ))}
                </div>
                {plan && activeMatch && <PlanCard plan={plan} match={activeMatch} />}
              </>
            )}

            <div className="pt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setStep(1);
                  setMatches([]);
                  setPlan(null);
                  setActiveMatch(null);
                  setWaitlistMsg(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ↻ {t("Start over", "重新开始", "重新嚟過")}
              </button>
              <span className="text-xs text-muted-foreground">·</span>
              <Link to="/match" className="text-xs text-primary hover:underline">
                {t("See all matches →", "查看所有匹配 →", "睇晒所有配對 →")}
              </Link>
            </div>
          </div>
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

function Stepper({ step, t }: { step: number; t: (en: string, zh: string, yue: string) => string }) {
  const items = [
    { n: 1, label: t("Describe", "描述", "描述") },
    { n: 2, label: t("AI profile", "AI 画像", "AI 檔案") },
    { n: 3, label: t("Match & meet", "匹配 & 见面", "配對 & 見面") },
  ];
  return (
    <ol className="flex items-center gap-3 text-xs">
      {items.map((it, i) => (
        <li key={it.n} className="flex items-center gap-3">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border ${
              step >= it.n ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
            }`}
          >
            {step > it.n ? <CheckCircle2 className="h-4 w-4" /> : it.n}
          </span>
          <span className={step >= it.n ? "text-foreground" : "text-muted-foreground"}>{it.label}</span>
          {i < items.length - 1 && <span className="h-px w-8 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

function ProfileCard({
  profile,
  t,
  onRegenerate,
  regenerating,
}: {
  profile: Profile;
  t: (en: string, zh: string, yue: string) => string;
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  const ai = (profile.profile_data?.ai ?? {}) as {
    headline?: string;
    narrative?: string;
    patterns?: Array<{ insight: string; evidence: string }>;
    dimensions?: Array<{ key: string; score: number; why: string }>;
    // legacy v1 (kept for back-compat, no longer rendered as primary UI)
    summary?: string;
    traits?: Record<string, number>;
    interests?: string[];
    communication_style?: string;
    looking_for?: string;
    ideal_match?: string;
  };
  const narrativeParas = (ai.narrative ?? ai.summary ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const patterns = ai.patterns ?? [];
  const dimensions = ai.dimensions ?? [];
  const interests = ai.interests ?? [];

  // v1 fallback: derive dimensions from traits if dimensions[] is missing
  const fallbackDimensions = dimensions.length > 0
    ? dimensions
    : Object.entries(ai.traits ?? {}).map(([k, v]) => ({
        key: k,
        score: Number(v),
        why: "",
      }));

  return (
    <div className="rounded-sm border border-border bg-background/40 p-6 sm:p-8 space-y-7">
      {/* Headline */}
      {ai.headline && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("Your headline", "你的标签", "你嘅標籤")}
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold italic text-gold-glow sm:text-3xl">
            {ai.headline}
          </h3>
        </div>
      )}

      {/* Narrative */}
      {narrativeParas.length > 0 && (
        <div className="space-y-3 border-l-2 border-primary/30 pl-4">
          {narrativeParas.map((p, i) => (
            <p key={i} className="text-[15px] leading-[1.75] text-foreground/90">
              {p}
            </p>
          ))}
        </div>
      )}

      {/* Patterns — the "AI 看到了你没说的" centerpiece */}
      {patterns.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("What AI saw that you didn't say", "AI 看到了你没说的", "AI 見到你無講嘅")}
          </p>
          <div className="space-y-2.5">
            {patterns.map((p, i) => (
              <div
                key={i}
                className="rounded-sm border border-primary/20 bg-primary/5 p-4 transition-colors hover:border-primary/40"
              >
                <p className="text-sm leading-relaxed text-foreground/95">{p.insight}</p>
                {p.evidence && (
                  <p className="mt-2 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                    {t("You said:", "你说过：", "你講過：")}「{p.evidence}」
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dimensions — 5 axes with `why` explanations */}
      {fallbackDimensions.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("Five dimensions", "五个维度", "五個維度")}
          </p>
          <div className="space-y-3.5">
            {fallbackDimensions.map((d) => {
              const score = Math.max(0, Math.min(1, Number(d.score)));
              return (
                <div key={d.key}>
                  <div className="flex items-baseline gap-3">
                    <span className="w-32 shrink-0 text-xs font-medium uppercase tracking-wider text-foreground/80">
                      {d.key}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-gradient-to-r from-primary/70 to-primary"
                        style={{ width: `${score * 100}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {Math.round(score * 100)}
                    </span>
                  </div>
                  {d.why && (
                    <p className="ml-32 mt-1 text-xs leading-relaxed text-muted-foreground">
                      — {d.why}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interests (v1 compat) */}
      {interests.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("Interests", "兴趣标签", "興趣標籤")}
          </p>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <span
                key={i}
                className="rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-xs text-foreground/80"
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Regenerate */}
      {onRegenerate && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60"
          >
            {regenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {t(
              "Get a deeper take",
              "让 AI 再深度分析一次",
              "畀 AI 再深入睇一次",
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
