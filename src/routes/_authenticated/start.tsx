import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  Briefcase,
  Heart,
  Users,
  Sparkles,
  Loader2,
  Calendar,
  MapPin,
  MessageSquare,
  LogOut,
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

type Scenario = "business" | "dating" | "partner";

type Profile = {
  id: string;
  profile_data: {
    ai?: {
      summary?: string;
      traits?: Record<string, number>;
      interests?: string[];
      communication_style?: string;
      looking_for?: string;
      ideal_match?: string;
    };
  };
};

type MatchRow = {
  id: string;
  match_score: number;
  scenario: string;
  details: {
    name?: string;
    age?: number;
    city?: string;
    headline?: string;
    bio?: string;
    shared_interests?: string[];
    reason?: string;
  };
};

type MeetPlan = {
  id: string;
  plan_content: {
    ai?: {
      when?: string;
      where?: string;
      activity?: string;
      duration?: string;
      icebreakers?: string[];
      vibe_tip?: string;
      first_message?: string;
    };
  };
};

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

function StartPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scenario, setScenario] = useState<Scenario>("dating");
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [activeMatch, setActiveMatch] = useState<MatchRow | null>(null);
  const [plan, setPlan] = useState<MeetPlan | null>(null);
  const [loading, setLoading] = useState<null | "profile" | "match" | "plan">(null);
  const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const scenarios = useMemo(
    () =>
      [
        { id: "business" as const, label: t("Business", "工作"), icon: Briefcase, desc: t("Co-founders, collaborators, mentors.", "合伙人、合作者、导师。") },
        { id: "dating" as const, label: t("Dating", "恋爱"), icon: Heart, desc: t("Real chemistry, not endless swipes.", "真实的化学反应，告别无限左滑。") },
        { id: "partner" as const, label: t("Local friends", "本地朋友"), icon: Users, desc: t("Weekend partners, hobby buddies.", "周末搭子、兴趣伙伴。") },
      ],
    [lang],
  );

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const generateProfile = async () => {
    setErr(null);
    if (input.trim().length < 12) {
      setErr(t("Tell us a bit more — at least a couple of sentences.", "请多写一些，至少几句话。"));
      return;
    }
    setLoading("profile");
    try {
      const res = await authedFetch("/api/ai/generate-profile", {
        method: "POST",
        body: JSON.stringify({ input, scenario, lang }),
      });
      setProfile((res as { data: Profile }).data);
      setStep(2);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  const findMatches = async () => {
    setErr(null);
    setLoading("match");
    try {
      const res = await authedFetch("/api/ai/match", {
        method: "POST",
        body: JSON.stringify({ scenario, lang }),
      });
      setMatches((res as { data: MatchRow[] }).data);
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
      const res = await authedFetch("/api/ai/meet-plan", {
        method: "POST",
        body: JSON.stringify({ match_id: m.id, lang }),
      });
      setPlan((res as { data: MeetPlan }).data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{email}</span>
            <button onClick={signOut} className="inline-flex items-center gap-1 hover:text-foreground">
              <LogOut className="h-3.5 w-3.5" />
              {t("Sign out", "退出")}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Stepper step={step} t={t} />

        {step === 1 && (
          <div className="mt-10 space-y-6">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="text-gold-glow">{t("Tell linQ about you", "告诉 linQ 你是谁")}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                "Anything — your day, your obsessions, what you're looking for. AI turns it into your match profile.",
                "随便写——你的一天、你的爱好、你在找的人。AI 会把它变成你的匹配画像。",
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
                {t("Generate AI profile", "生成 AI 画像")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && profile && (
          <div className="mt-10 space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="text-gold-glow">{t("Your AI profile", "你的 AI 画像")}</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("Looks good? Let AI find your top 3 matches.", "看起来对吗？让 AI 为你挑出 3 个最佳匹配。")}
            </p>
            <ProfileCard profile={profile} t={t} />
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="text-xs text-muted-foreground hover:text-foreground">
                ← {t("Edit description", "重新描述")}
              </button>
              <button
                onClick={findMatches}
                disabled={loading === "match"}
                className="group inline-flex h-12 items-center gap-2 rounded-sm bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {loading === "match" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t("Find my matches", "开始匹配")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-10 space-y-6">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="text-gold-glow">{t("Your 3 matches", "你的 3 个匹配")}</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("Pick one — AI will draft a thoughtful first meet-up.", "选一个——AI 会为你拟一份贴心的见面方案。")}
            </p>

            <div className="space-y-4">
              {matches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  active={activeMatch?.id === m.id}
                  onPlan={() => planMeet(m)}
                  loading={loading === "plan" && activeMatch?.id === m.id}
                  t={t}
                />
              ))}
            </div>

            {plan && activeMatch && <PlanCard plan={plan} match={activeMatch} t={t} />}

            <div className="pt-4">
              <button
                onClick={() => {
                  setStep(1);
                  setMatches([]);
                  setPlan(null);
                  setActiveMatch(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ↻ {t("Start over", "重新开始")}
              </button>
            </div>
          </div>
        )}

        {err && (
          <div className="mt-6 rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {err}
          </div>
        )}
      </section>
    </main>
  );
}

function Stepper({ step, t }: { step: number; t: (en: string, zh: string) => string }) {
  const items = [
    { n: 1, label: t("Describe", "描述") },
    { n: 2, label: t("AI profile", "AI 画像") },
    { n: 3, label: t("Match & meet", "匹配 & 见面") },
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

function ProfileCard({ profile, t }: { profile: Profile; t: (en: string, zh: string) => string }) {
  const ai = profile.profile_data?.ai ?? {};
  const traits = ai.traits ?? {};
  return (
    <div className="rounded-sm border border-border bg-background/40 p-6 space-y-4">
      {ai.summary && <p className="text-base leading-relaxed">{ai.summary}</p>}
      {ai.interests && ai.interests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ai.interests.map((i) => (
            <span key={i} className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
              {i}
            </span>
          ))}
        </div>
      )}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {ai.communication_style && (
          <Row label={t("Communication", "沟通风格")} value={ai.communication_style} />
        )}
        {ai.looking_for && <Row label={t("Looking for", "在找的")} value={ai.looking_for} />}
        {ai.ideal_match && <Row label={t("Ideal match", "理想对象")} value={ai.ideal_match} />}
      </dl>
      {Object.keys(traits).length > 0 && (
        <div className="space-y-2 pt-2">
          {Object.entries(traits).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3">
              <span className="w-32 text-xs uppercase tracking-wider text-muted-foreground">{k}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(1, Number(v))) * 100}%` }} />
              </div>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                {Math.round(Math.max(0, Math.min(1, Number(v))) * 100)}
              </span>
            </div>
          ))}
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

function MatchCard({
  match,
  active,
  loading,
  onPlan,
  t,
}: {
  match: MatchRow;
  active: boolean;
  loading: boolean;
  onPlan: () => void;
  t: (en: string, zh: string) => string;
}) {
  const d = match.details ?? {};
  return (
    <div
      className={`rounded-sm border p-5 transition-all ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-semibold tracking-tight">{d.name ?? "Match"}</h3>
            {d.age && <span className="text-xs text-muted-foreground">{d.age}</span>}
            {d.city && <span className="text-xs text-muted-foreground">· {d.city}</span>}
          </div>
          {d.headline && <p className="mt-1 text-sm text-muted-foreground">{d.headline}</p>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-gold-glow tabular-nums">{match.match_score.toFixed(1)}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("Match", "匹配度")}</div>
        </div>
      </div>
      {d.bio && <p className="mt-3 text-sm leading-relaxed">{d.bio}</p>}
      {d.shared_interests && d.shared_interests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {d.shared_interests.map((s) => (
            <span key={s} className="rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-xs">
              {s}
            </span>
          ))}
        </div>
      )}
      {d.reason && (
        <p className="mt-3 rounded-sm border-l-2 border-primary/60 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-primary">{t("Why", "为何匹配")}: </span>
          {d.reason}
        </p>
      )}
      <div className="mt-4">
        <button
          onClick={onPlan}
          disabled={loading}
          className="group inline-flex h-10 items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {t("Plan a meet-up", "生成见面方案")}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  match,
  t,
}: {
  plan: MeetPlan;
  match: MatchRow;
  t: (en: string, zh: string) => string;
}) {
  const p = plan.plan_content?.ai ?? {};
  return (
    <div className="rounded-sm border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {t("AI meet-up plan with", "AI 见面方案 ·")} {match.details?.name}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {p.when && <PlanRow icon={Calendar} label={t("When", "时间")} value={p.when} />}
        {p.where && <PlanRow icon={MapPin} label={t("Where", "地点")} value={p.where} />}
        {p.activity && <PlanRow icon={Sparkles} label={t("Activity", "活动")} value={p.activity} />}
        {p.duration && <PlanRow icon={Calendar} label={t("Duration", "时长")} value={p.duration} />}
      </div>
      {p.icebreakers && p.icebreakers.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Icebreakers", "破冰话题")}</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {p.icebreakers.map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">{i + 1}.</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {p.vibe_tip && (
        <p className="text-xs text-muted-foreground italic">"{p.vibe_tip}"</p>
      )}
      {p.first_message && (
        <div className="rounded-sm border border-border bg-background/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            {t("First message", "首条消息")}
          </div>
          <p className="text-sm">{p.first_message}</p>
        </div>
      )}
    </div>
  );
}

function PlanRow({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 text-primary" />
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}