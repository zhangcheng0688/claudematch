import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  ThumbsUp,
  ThumbsDown,
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

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [scenario, setScenario] = useState<Scenario>("dating");
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [activeMatch, setActiveMatch] = useState<MatchRow | null>(null);
  const [plan, setPlan] = useState<MeetPlan | null>(null);
  const [loading, setLoading] = useState<null | "profile" | "match" | "plan">(null);
  const [err, setErr] = useState<string | null>(null);
  const [waitlistMsg, setWaitlistMsg] = useState<string | null>(null);
  // 漏洞 C: city is a required field — feeding it to the meet-plan LLM
  // gives us real restaurants in the right city (no more 深圳 fallback
  // for 上海 users). Stored on the user_profiles row so it survives
  // refreshes and shows up in meet-plan queries.
  const [city, setCity] = useState<"shenzhen" | "shanghai" | null>(null);
  const [citySaving, setCitySaving] = useState(false);

  const scenarios = useMemo(
    () => [
      { id: "business" as const, label: t("Business", "工作", "工作"), icon: Briefcase, desc: t("Co-founders, collaborators, mentors.", "合伙人、合作者、导师。", "Co-founder、合作拍檔、師傅。") },
      { id: "dating" as const, label: t("Dating", "恋爱", "拍拖"), icon: Heart, desc: t("Real chemistry, not endless swipes.", "真实的化学反应，告别无限左滑。", "真正嘅化學反應，唔係無止境嘅左掃。") },
      { id: "partner" as const, label: t("Local friends", "本地朋友", "本地朋友"), icon: Users, desc: t("Weekend partners, hobby buddies.", "周末搭子、兴趣伙伴。", "週末拍檔、興趣班底。") },
    ],
    [lang],
  );

  // 漏洞 C: load user's city from latest user_profiles row (if any).
  // If they've been here before, skip step 0 and jump straight to step 1.
  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch<{ data: { profile_data?: { city?: string } } | null }>(
          "/api/user/me",
          { method: "GET" },
        );
        const me = (res as { data?: { ai_profile?: { profile_data?: { city?: string } } } }).data?.ai_profile;
        const c = me?.profile_data?.city;
        if (c === "shenzhen" || c === "shanghai") {
          setCity(c);
          setStep(1); // already chose — skip step 0
        }
      } catch {
        /* ignore; user just hits step 0 */
      }
    })();
  }, []);

  const saveCityAndContinue = async (c: "shenzhen" | "shanghai") => {
    setCitySaving(true);
    try {
      // Persist via a lightweight endpoint — we re-use the me endpoint
      // shape by writing the city into user_profiles.profile_data.city
      // through a new tiny endpoint /api/user/set-city. (We don't
      // reuse /api/user/me because that's a GET; we need a write.)
      await authedFetch("/api/user/set-city", {
        method: "POST",
        body: JSON.stringify({ city: c }),
      });
      setCity(c);
      setStep(1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save city");
    } finally {
      setCitySaving(false);
    }
  };

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
        body: JSON.stringify({ input, scenario, lang, city }),
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

        {/* Step 0 (漏洞 C): city picker. Required — feeds real restaurants
            to the meet-plan LLM so 上海 users don't get 深圳 venues. */}
        {step === 0 && (
          <div className="mt-10 space-y-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="text-gold-glow">
                {t("Where are you based?", "你在哪座城市？", "你喺邊個城市？")}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                "We'll use this to recommend real restaurants near you. linQ currently operates in two cities — more coming soon.",
                "我们会用这个推荐你附近的真实餐厅。linQ 目前在两座城市运营 — 后续会扩展。",
                "我哋會用呢個推薦你附近嘅真實餐廳。linQ 而家喺兩個城市營運 — 之後會擴。",
              )}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                { id: "shenzhen" as const, name: "深圳 / Shenzhen", emoji: "🌃" },
                { id: "shanghai" as const, name: "上海 / Shanghai", emoji: "🌆" },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => saveCityAndContinue(opt.id)}
                  disabled={citySaving}
                  className="group flex items-center justify-between gap-3 rounded-sm border border-border bg-background/40 p-5 text-left transition-all hover:border-primary/60 hover:bg-primary/5 disabled:opacity-60"
                >
                  <div>
                    <div className="text-2xl">{opt.emoji}</div>
                    <div className="mt-2 text-sm font-medium">{opt.name}</div>
                  </div>
                  {citySaving ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <span className="text-xs text-muted-foreground group-hover:text-primary">
                      {t("Continue →", "继续 →", "繼續 →")}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {err && (
              <p className="text-xs text-destructive">{err}</p>
            )}
          </div>
        )}

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
                ← {t("Edit description", "重新描述", "再講過")}
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
    { n: 1, label: t("Describe", "描述", "講下你") },
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
    patterns?: Array<{
      insight: string;
      evidence: string;
      reasoning_chain?: string[];
    }>;
    dimensions?: Array<{
      key: string;
      score: number;
      why: string;
      signals?: string[];
    }>;
    paradoxes?: Array<{ surface: string; depth: string; tension: string }>;
    archetypes?: Array<{ name: string; why: string; shadow: string }>;
    match_signals?: {
      needs: Array<{ what: string; why: string }>;
      gifts: Array<{ what: string; why: string }>;
      risks: Array<{ what: string; impact: string }>;
    };
    // v4 fields
    life_themes?: Array<{ name: string; evidence: string }>;
    scene_predictions?: Array<{ context: string; behavior: string; why: string }>;
    growth_stage?: {
      stage: string;
      label: string;
      why: string;
    };
    aesthetic_signature?: {
      preferences: string[];
      contradiction: string;
    };
    defense_mechanisms?: Array<{
      mechanism: string;
      when_triggered: string;
      behavior: string;
    }>;
    communication_recipes?: Array<{
      context: string;
      recipe: string;
      avoid: string;
    }>;
    // legacy v1
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
  const paradoxes = ai.paradoxes ?? [];
  const archetypes = ai.archetypes ?? [];
  const matchSignals = ai.match_signals;
  const lifeThemes = ai.life_themes ?? [];
  const scenePredictions = ai.scene_predictions ?? [];
  const growthStage = ai.growth_stage;
  const aesthetic = ai.aesthetic_signature;
  const defenseMechanisms = ai.defense_mechanisms ?? [];
  const communicationRecipes = ai.communication_recipes ?? [];

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
            {t("Your portrait", "你的画像", "你嘅畫像")}
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

      {/* v4 Life themes */}
      {lifeThemes.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("Your life themes", "你正在经历的主题", "你經歷緊嘅主題")}
          </p>
          <div className="space-y-2">
            {lifeThemes.map((lt, i) => (
              <div
                key={i}
                className="rounded-sm border border-rose-500/20 bg-rose-500/5 p-3"
              >
                <p className="text-sm font-medium text-rose-300">{lt.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {lt.evidence}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* v4 Growth stage */}
      {growthStage && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("Where you are in life", "你现在在哪个阶段", "你而家喺邊個階段")}
          </p>
          <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-lg font-semibold italic text-amber-300">
                {growthStage.label}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {growthStage.stage}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {growthStage.why}
            </p>
          </div>
        </div>
      )}

      {/* v3 Paradoxes */}
      {paradoxes.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("What you want vs what you actually want", "你表面想要 vs 实际想要的", "你表面想要 vs 實際想要嘅")}
          </p>
          <div className="space-y-3">
            {paradoxes.map((p, i) => (
              <div
                key={i}
                className="rounded-sm border border-amber-500/30 bg-amber-500/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {t("You said", "你表面说的", "你表面講嘅")}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                      {p.surface}
                    </p>
                  </div>
                  <span className="self-center text-lg text-amber-500/70">↔</span>
                  <div className="flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-amber-400">
                      {t("You actually want", "你实际想要的", "你實際想要嘅")}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/95">
                      {p.depth}
                    </p>
                  </div>
                </div>
                {p.tension && (
                  <p className="mt-3 border-t border-amber-500/20 pt-2 text-xs italic leading-relaxed text-muted-foreground">
                    {p.tension}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* v3 Archetypes */}
      {archetypes.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("Who you resemble", "你的人格原型", "你嘅人格原型")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {archetypes.map((a, i) => (
              <div
                key={i}
                className="rounded-sm border border-violet-500/30 bg-violet-500/5 p-4"
              >
                <p className="font-display text-base font-semibold italic text-violet-300">
                  {a.name}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {a.why}
                </p>
                {a.shadow && (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    {t("Shadow:", "阴影面：", "陰影面：")} {a.shadow}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* v4 Scene predictions */}
      {scenePredictions.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("How you'll actually behave", "你在这些场景会怎么表现", "你喺呢啲場景會點做")}
          </p>
          <div className="space-y-3">
            {scenePredictions.map((sp, i) => (
              <div
                key={i}
                className="rounded-sm border border-cyan-500/30 bg-cyan-500/5 p-4"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-400">
                  {sp.context}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/95">
                  {sp.behavior}
                </p>
                <p className="mt-1 text-[11px] italic text-muted-foreground">
                  — {sp.why}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      {patterns.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("What AI saw that you didn't say", "AI 看到了你没说的", "AI 見到你無講嘅")}
          </p>
          <div className="space-y-2.5">
            {patterns.map((p, i) => (
              <PatternRow
                key={i}
                insight={p.insight}
                evidence={p.evidence}
                reasoningChain={p.reasoning_chain}
                t={t}
                onFeedback={async (verdict) => {
                  try {
                    await authedFetch("/api/feedback/pattern", {
                      method: "POST",
                      body: JSON.stringify({
                        pattern_text: p.insight,
                        section: "patterns",
                        verdict,
                      }),
                    });
                  } catch {
                    /* swallow — feedback is best-effort */
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dimensions */}
      {fallbackDimensions.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("Your five work/relationship dimensions", "五个作业/关系维度", "五個作業/關係維度")}
          </p>
          <div className="space-y-4">
            {fallbackDimensions.map((d) => {
              const score = Math.max(0, Math.min(1, Number(d.score)));
              const signals = (d as { signals?: string[] }).signals ?? [];
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
                  {signals.length > 0 && (
                    <ul className="ml-32 mt-2 space-y-1 border-l border-border/60 pl-3">
                      {signals.map((s, j) => (
                        <li
                          key={j}
                          className="text-[11px] leading-relaxed text-muted-foreground/90"
                        >
                          • {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* v4 Aesthetic signature */}
      {aesthetic && (aesthetic.preferences.length > 0 || aesthetic.contradiction) && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("Your aesthetic signature", "你的审美指纹", "你嘅審美指紋")}
          </p>
          <div className="rounded-sm border border-fuchsia-500/30 bg-fuchsia-500/5 p-4">
            {aesthetic.preferences.length > 0 && (
              <ul className="space-y-1">
                {aesthetic.preferences.map((p, i) => (
                  <li
                    key={i}
                    className="text-sm text-foreground/95 before:mr-2 before:text-fuchsia-400 before:content-['◆']"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            )}
            {aesthetic.contradiction && (
              <p className="mt-3 border-t border-fuchsia-500/20 pt-2 text-xs italic leading-relaxed text-muted-foreground">
                {aesthetic.contradiction}
              </p>
            )}
          </div>
        </div>
      )}

      {/* v4 Defense mechanisms */}
      {defenseMechanisms.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("How you defend", "你的心理防御", "你嘅心理防禦")}
          </p>
          <div className="space-y-2">
            {defenseMechanisms.map((dm, i) => (
              <div
                key={i}
                className="rounded-sm border border-orange-500/30 bg-orange-500/5 p-3"
              >
                <p className="text-sm font-medium text-orange-300">
                  {dm.mechanism}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  <span className="text-orange-400/80">
                    {t("Trigger:", "触发：", "觸發：")}
                  </span>{" "}
                  {dm.when_triggered}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground/85">
                  {dm.behavior}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* v4 Communication recipes */}
      {communicationRecipes.length > 0 && (
        <div>
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("How to talk to you", "跟你沟通的最佳方式", "同你傾偈嘅最佳方式")}
          </p>
          <div className="space-y-2">
            {communicationRecipes.map((r, i) => (
              <div
                key={i}
                className="rounded-sm border border-teal-500/30 bg-teal-500/5 p-3"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-teal-400">
                  {r.context}
                </p>
                <p className="mt-1 text-sm text-foreground/95">
                  <span className="text-emerald-400/90">+</span> {r.recipe}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="text-rose-400/80">−</span> {r.avoid}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* v3 Match signals */}
      {matchSignals &&
        (matchSignals.needs.length > 0 ||
          matchSignals.gifts.length > 0 ||
          matchSignals.risks.length > 0) && (
          <div>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {t("What people around you feel", "你身边的人会感受到的", "你身邊嘅人會感受到嘅")}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {matchSignals.needs.length > 0 && (
                <div className="rounded-sm border border-sky-500/30 bg-sky-500/5 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-sky-400">
                    {t("Needs", "需要", "需要")}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {matchSignals.needs.map((n, i) => (
                      <li key={i}>
                        <p className="text-sm text-foreground/95">{n.what}</p>
                        <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                          {n.why}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {matchSignals.gifts.length > 0 && (
                <div className="rounded-sm border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                    {t("Gives", "能给", "能俾")}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {matchSignals.gifts.map((g, i) => (
                      <li key={i}>
                        <p className="text-sm text-foreground/95">{g.what}</p>
                        <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                          {g.why}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {matchSignals.risks.length > 0 && (
                <div className="rounded-sm border border-rose-500/30 bg-rose-500/5 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-rose-400">
                    {t("Risks", "风险", "風險")}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {matchSignals.risks.map((r, i) => (
                      <li key={i}>
                        <p className="text-sm text-foreground/95">{r.what}</p>
                        <p className="mt-0.5 text-[11px] italic text-muted-foreground">
                          {r.impact}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Interests (legacy) */}
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
              "Re-analyze me from scratch",
              "再深度分析一次",
              "再深入分析一次",
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

function PatternRow({
  insight,
  evidence,
  reasoningChain,
  t,
  onFeedback,
}: {
  insight: string;
  evidence?: string;
  reasoningChain?: string[];
  t: (en: string, zh: string, yue: string) => string;
  onFeedback: (verdict: "agree" | "disagree") => void;
}) {
  const [verdict, setVerdict] = useState<"agree" | "disagree" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (v: "agree" | "disagree") => {
    if (submitting || verdict !== null) return;
    setSubmitting(true);
    // Optimistic: flip the visual state immediately. The endpoint
    // call is fire-and-forget; if it fails we revert.
    setVerdict(v);
    try {
      await onFeedback(v);
    } catch {
      // P2-deferred 6: rollback the optimistic update on failure.
      // The user sees the button briefly flip, then snap back, with
      // a tiny error toast. Better than a silent "nothing happened".
      setVerdict(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <details
      className="group rounded-sm border border-primary/20 bg-primary/5 transition-colors hover:border-primary/40"
    >
      <summary className="cursor-pointer list-none p-4">
        <p className="text-sm leading-relaxed text-foreground/95">{insight}</p>
        {evidence && (
          <p className="mt-2 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
            {t("You said:", "你说过：", "你講過：")}「{evidence}」
          </p>
        )}
        {reasoningChain && reasoningChain.length > 0 && (
          <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground/70 group-open:hidden">
            {t("Tap to see AI's reasoning", "展开推理过程", "展開推理過程")} →
          </p>
        )}
        {/* Feedback row */}
        <div
          className="mt-3 flex items-center gap-2 border-t border-primary/10 pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
            {t("Does this fit you?", "这说的对吗？", "呢句啱唔啱？")}
          </span>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit("agree")}
            aria-label={t("Agree", "同意", "同意")}
            className={`inline-flex h-7 items-center gap-1 rounded-sm border px-2 text-xs transition-colors ${
              verdict === "agree"
                ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                : "border-border bg-background/40 text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-400"
            } disabled:opacity-60`}
          >
            <ThumbsUp className="h-3 w-3" />
            {verdict === "agree" ? t("Got it", "说对了", "啱") : t("Yes", "对", "啱")}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit("disagree")}
            aria-label={t("Disagree", "不同意", "唔啱")}
            className={`inline-flex h-7 items-center gap-1 rounded-sm border px-2 text-xs transition-colors ${
              verdict === "disagree"
                ? "border-rose-500/60 bg-rose-500/15 text-rose-400"
                : "border-border bg-background/40 text-muted-foreground hover:border-rose-500/40 hover:text-rose-400"
            } disabled:opacity-60`}
          >
            <ThumbsDown className="h-3 w-3" />
            {verdict === "disagree" ? t("Not me", "不是我", "唔係我") : t("No", "不对", "唔啱")}
          </button>
        </div>
      </summary>
      {reasoningChain && reasoningChain.length > 0 && (
        <div className="border-t border-primary/20 px-4 pb-4 pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("AI's reasoning chain", "AI 的推理过程", "AI 嘅推理過程")}
          </p>
          <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-foreground/85">
            {reasoningChain.map((step, j) => (
              <li key={j} className="flex gap-2">
                <span className="shrink-0 font-mono text-muted-foreground/70">
                  {j + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </details>
  );
}
