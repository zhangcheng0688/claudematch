// src/routes/founder.tsx
//
// Founder-only operations dashboard. The page lives outside the
// /_authenticated layout (no SPA session required) and instead
// uses a shared-secret header (FOUNDER_API_KEY) to call
// /api/admin/reconciliation. The user pastes the key once per
// visit; we store it in localStorage so they don't have to retype
// on every navigation within the dashboard.
//
// Security: this page is intentionally NOT linked from anywhere
// on the public site. It's only findable if you know the URL.
// Brute-forcing the key is the only attack surface; we use 32-byte
// random secrets so the search space is 2^256.
//
// What this page shows:
//   1. Funnel summary (all-time + last 30 days)
//   2. This month's restaurant leaderboard (top 50 by valid visits)
//   3. Pending 24h confirmations (the rows that need founder follow-up)
//   4. Recent NPS scores (pulse on product sentiment)
//
// All in one self-contained page. The styling uses the same
// primitives as the rest of the SPA (Tailwind + linQ tokens)
// but ships no auth, no nav, no shell — just the dashboard.

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Loader2, RefreshCw, XCircle } from "lucide-react";

const KEY_STORAGE = "linq.founder.key";
const DEFAULT_SINCE_DAYS = 30;

export const Route = createFileRoute("/founder")({
  head: () => ({
    meta: [
      { title: "linQ · Founder dashboard" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <LanguageProvider>
      <FounderDashboard />
    </LanguageProvider>
  ),
});

type FunnelRow = {
  scope: string;
  total_users: number;
  total_matches: number;
  total_plan_views: number;
  total_booking_taps: number;
  total_claims: number;
  total_valid_visits: number;
};

type VenueRow = {
  venue_id: string;
  venue_name: string;
  city: string;
  district: string | null;
  commission_pct: number;
  booking_method: string;
  venue_is_active: boolean;
  year_month: string;
  unique_users: number;
  total_views: number;
  total_call_taps: number;
  total_navigate_taps: number;
  total_claims: number;
  total_valid_visits: number;
  estimated_rebate_cny: number;
};

type PendingRow = {
  attribution_id: string;
  user_id: string;
  venue_id: string;
  venue_name: string;
  confirmed_at: string;
  hours_since_confirm: number;
  confirmation_status: "within_window" | "past_due";
};

type NpsRow = {
  id: string;
  user_id: string;
  kind: "nps" | "survey" | "unsubscribe" | "bug_report" | "praise";
  score: number | null;
  body: string | null;
  source: string | null;
  created_at: string;
};

type DashboardData = {
  funnel_summary: FunnelRow[];
  venues_this_month: VenueRow[];
  since_days: number;
};

function FounderDashboard() {
  const { lang } = useLang();
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  const [key, setKey] = useState<string>("");
  const [sinceDays, setSinceDays] = useState<number>(DEFAULT_SINCE_DAYS);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [pending, setPending] = useState<PendingRow[] | null>(null);
  const [npsRows, setNpsRows] = useState<NpsRow[] | null>(null);

  // Load the key from localStorage on mount
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY_STORAGE);
      if (v) setKey(v);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchAll = useCallback(
    async (k: string) => {
      setErr(null);
      setLoading(true);
      const headers = { "X-Founder-Key": k };
      try {
        const [dRes, pRes, nRes] = await Promise.all([
          fetch(
            `/api/admin/reconciliation?since_days=${sinceDays}`,
            { headers },
          ),
          fetch(`/api/admin/reconciliation?pending=true`, { headers }),
          fetch(`/api/admin/reconciliation?nps=true`, { headers }),
        ]);
        if (dRes.status === 403) {
          setErr(t("Invalid founder key", "founder key 不对"));
          setLoading(false);
          return;
        }
        if (!dRes.ok) {
          const body = await dRes.json().catch(() => ({}));
          setErr(body.error ?? `HTTP ${dRes.status}`);
          setLoading(false);
          return;
        }
        const dJson = (await dRes.json()) as { data: DashboardData };
        setData(dJson.data);
        if (pRes.ok) {
          const pJson = (await pRes.json()) as { data: PendingRow[] };
          setPending(pJson.data);
        }
        if (nRes.ok) {
          const nJson = (await nRes.json()) as { data: NpsRow[] };
          setNpsRows(nJson.data);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    [sinceDays, t],
  );

  // Auto-fetch when key is non-empty
  useEffect(() => {
    if (key) fetchAll(key);
  }, [key, fetchAll]);

  const persistKey = (k: string) => {
    setKey(k);
    try {
      localStorage.setItem(KEY_STORAGE, k);
    } catch {
      /* ignore */
    }
  };

  const clearKey = () => {
    setKey("");
    setData(null);
    setPending(null);
    setNpsRows(null);
    try {
      localStorage.removeItem(KEY_STORAGE);
    } catch {
      /* ignore */
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              <span className="text-gold-glow">linQ</span>{" "}
              {t("Founder dashboard", "Founder 后台")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "Operations, reconciliation, and product pulse. Founder-only.",
                "运营、对账和产品脉搏。仅创始人可见。",
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t("Last", "范围")}:</span>
            <select
              value={sinceDays}
              onChange={(e) => setSinceDays(Number(e.target.value))}
              className="h-8 rounded-sm border border-border bg-background/40 px-2 text-xs"
            >
              <option value={7}>7d</option>
              <option value={30}>30d</option>
              <option value={90}>90d</option>
            </select>
            <button
              onClick={() => key && fetchAll(key)}
              disabled={!key || loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-background/40 px-3 text-xs hover:bg-accent disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {t("Refresh", "刷新")}
            </button>
          </div>
        </header>

        {/* Auth gate */}
        {!key && (
          <section className="rounded-sm border border-border bg-background/40 p-6">
            <h2 className="text-base font-semibold">
              {t("Enter founder key", "输入 founder key")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "The X-Founder-Key header you set in Cloud env (FOUNDER_API_KEY).",
                "你在 Cloud env 设置的 X-Founder-Key header（FOUNDER_API_KEY）。",
              )}
            </p>
            <KeyForm
              onSubmit={(k) => {
                persistKey(k);
                fetchAll(k);
              }}
              t={t}
            />
          </section>
        )}

        {err && (
          <div className="mt-6 rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {err}
          </div>
        )}

        {data && (
          <div className="mt-8 space-y-10">
            <FunnelSection rows={data.funnel_summary} t={t} />
            <VenuesSection venues={data.venues_this_month} t={t} />
            <NpsSection rows={npsRows ?? []} t={t} />
            <PendingSection
              rows={pending ?? []}
              onClear={clearKey}
              t={t}
            />
          </div>
        )}
      </div>
    </main>
  );
}

function KeyForm({
  onSubmit,
  t,
}: {
  onSubmit: (k: string) => void;
  t: (en: string, zh: string) => string;
}) {
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onSubmit(v.trim());
      }}
      className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input
        type="password"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={t("founder key…", "founder key…")}
        autoComplete="off"
        className="h-10 flex-1 rounded-sm border border-border bg-background/60 px-3 text-sm outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={!v.trim()}
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {t("Sign in", "进入")}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

function FunnelSection({ rows, t }: { rows: FunnelRow[]; t: (en: string, zh: string) => string }) {
  const allTime = rows.find((r) => r.scope === "all_time") ?? null;
  const lastWindow = rows.find((r) => r.scope.startsWith("last_")) ?? null;
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">
        {t("Funnel summary", "漏斗汇总")}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FunnelCard
          title={t("All time", "总计")}
          rows={allTime}
          t={t}
        />
        <FunnelCard
          title={t("Recent window", "最近窗口")}
          rows={lastWindow}
          t={t}
        />
      </div>
    </section>
  );
}

function FunnelCard({
  title,
  rows,
  t,
}: {
  title: string;
  rows: FunnelRow | null;
  t: (en: string, zh: string) => string;
}) {
  if (!rows) {
    return (
      <div className="rounded-sm border border-border bg-background/40 p-5 text-xs text-muted-foreground">
        {t("No data", "暂无数据")} · {title}
      </div>
    );
  }
  const claimRate = rows.total_booking_taps > 0
    ? Math.round((rows.total_claims / rows.total_booking_taps) * 100)
    : 0;
  const validRate = rows.total_claims > 0
    ? Math.round((rows.total_valid_visits / rows.total_claims) * 100)
    : 0;
  return (
    <div className="rounded-sm border border-border bg-background/40 p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title} <span className="ml-2 text-foreground/70">({rows.scope})</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Metric label={t("Users", "用户")} value={rows.total_users} />
        <Metric label={t("Matches", "匹配")} value={rows.total_matches} />
        <Metric label={t("Plan views", "方案查看")} value={rows.total_plan_views} />
        <Metric label={t("Booking taps", "预订点击")} value={rows.total_booking_taps} />
        <Metric label={t("Claims", "声称去")} value={rows.total_claims} />
        <Metric
          label={t("Valid visits", "有效到店")}
          value={rows.total_valid_visits}
          accent
        />
      </div>
      <div className="mt-4 space-y-1 text-[11px] text-muted-foreground">
        <p>
          {t("Claim rate", "声称率")}: <span className="text-foreground">{claimRate}%</span>{" "}
          {t("(claims ÷ booking taps)", "（声称 / 预订点击）")}
        </p>
        <p>
          {t("Valid rate", "有效率")}: <span className="text-foreground">{validRate}%</span>{" "}
          {t("(valid ÷ claims)", "（有效 / 声称）")}
        </p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-sm border border-border/60 px-3 py-2 ${accent ? "bg-primary/10" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function VenuesSection({
  venues,
  t,
}: {
  venues: VenueRow[];
  t: (en: string, zh: string) => string;
}) {
  // Sort: by valid_visits desc, then by booking taps (call + navigate)
  const sorted = [...venues].sort((a, b) => {
    const v = b.total_valid_visits - a.total_valid_visits;
    if (v !== 0) return v;
    const bookingA = a.total_call_taps + a.total_navigate_taps;
    const bookingB = b.total_call_taps + b.total_navigate_taps;
    return bookingB - bookingA;
  });
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? sorted : sorted.slice(0, 20);

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">
        {t("Restaurant leaderboard (this month)", "餐厅排行榜（本月）")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "Sorted by valid visits. A commission_pct > 0 row is a signed partner; commission flows when the user actually visits.",
          "按有效到店排序。commission_pct > 0 的行是已签约合作方；用户真到店后即按比例返点。",
        )}
      </p>
      {sorted.length === 0 ? (
        <p className="mt-4 rounded-sm border border-border bg-background/40 p-6 text-center text-sm text-muted-foreground">
          {t("No venue data for this month yet.", "本月暂无餐厅数据。")}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t("Venue", "餐厅")}</th>
                <th className="px-3 py-2">{t("City", "城市")}</th>
                <th className="px-3 py-2">{t("Commission", "返点")}</th>
                <th className="px-3 py-2 text-right">{t("Users", "用户")}</th>
                <th className="px-3 py-2 text-right">{t("Taps", "点击")}</th>
                <th className="px-3 py-2 text-right">{t("Claims", "声称")}</th>
                <th className="px-3 py-2 text-right">{t("Valid", "有效")}</th>
                <th className="px-3 py-2">{t("Status", "状态")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((v) => (
                <tr key={v.venue_id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 font-medium">{v.venue_name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {v.city}
                    {v.district ? ` · ${v.district}` : ""}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {Number(v.commission_pct) > 0 ? (
                      <span className="text-primary">{v.commission_pct}%</span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{v.unique_users}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{v.total_call_taps + v.total_navigate_taps}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{v.total_claims}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-primary">
                    {v.total_valid_visits}
                  </td>
                  <td className="px-3 py-2">
                    {v.venue_is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {t("active", "活跃")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        <XCircle className="h-2.5 w-2.5" />
                        {t("paused", "暂停")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length > 20 && (
            <div className="border-t border-border bg-background/40 px-3 py-2 text-center">
              <button
                onClick={() => setShowAll((s) => !s)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {showAll
                  ? t("Show top 20 only", "只看前 20")
                  : t(`Show all ${sorted.length}`, `显示全部 ${sorted.length}`)}
                {showAll ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function NpsSection({
  rows,
  t,
}: {
  rows: NpsRow[];
  t: (en: string, zh: string) => string;
}) {
  const npsScores = rows.filter((r) => r.kind === "nps" && typeof r.score === "number");
  const promoter = npsScores.filter((r) => (r.score ?? 0) >= 9).length;
  const passive = npsScores.filter((r) => (r.score ?? 0) >= 7 && (r.score ?? 0) <= 8).length;
  const detractor = npsScores.filter((r) => (r.score ?? 0) <= 6).length;
  const nps = npsScores.length > 0
    ? Math.round(((promoter - detractor) / npsScores.length) * 100)
    : null;
  const unsubs = rows.filter((r) => r.kind === "unsubscribe").length;
  const surveys = rows.filter((r) => r.kind === "survey");

  const recent = npsScores.slice(0, 10);

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">
        {t("Product pulse (NPS + surveys)", "产品脉搏（NPS + 调研）")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "7-day check-in email feedback. NPS = % promoters minus % detractors. Survey bodies are quoted below.",
          "7 天回访问卷反馈。NPS = 推荐者比例 - 贬损者比例。问卷正文附在下方。",
        )}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <SummaryTile
          label={t("NPS", "NPS")}
          value={nps === null ? "—" : nps}
          accent={nps === null ? undefined : nps >= 30 ? "ok" : nps >= 0 ? "warn" : "warn"}
          t={t}
        />
        <SummaryTile
          label={t("Promoters (9-10)", "推荐者 (9-10)")}
          value={`${promoter} / ${npsScores.length}`}
          t={t}
        />
        <SummaryTile
          label={t("Detractors (0-6)", "贬损者 (0-6)")}
          value={`${detractor} / ${npsScores.length}`}
          t={t}
        />
        <SummaryTile
          label={t("Unsubscribes", "退订数")}
          value={unsubs}
          t={t}
        />
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t("Recent NPS scores", "最近 NPS 评分")}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {recent.map((r) => (
              <div
                key={r.id}
                className={`flex h-12 w-12 items-center justify-center rounded-sm border tabular-nums ${
                  (r.score ?? 0) >= 9
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : (r.score ?? 0) >= 7
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-400"
                }`}
                title={new Date(r.created_at).toLocaleString()}
              >
                {r.score}
              </div>
            ))}
          </div>
        </div>
      )}

      {surveys.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t("Recent survey bodies", "最近问卷正文")}
          </h3>
          <div className="mt-2 space-y-2">
            {surveys.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="rounded-sm border border-border bg-background/40 p-3 text-sm"
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()} · user {r.user_id.slice(0, 8)}…
                </div>
                <p className="mt-1 text-foreground/90 whitespace-pre-wrap">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PendingSection({
  rows,
  onClear,
  t,
}: {
  rows: PendingRow[];
  onClear: () => void;
  t: (en: string, zh: string) => string;
}) {
  const { lang } = useLang();
  const pastDue = rows.filter((r) => r.confirmation_status === "past_due");
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">
        {t("Pending 24h confirmations", "待 24h 确认")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "Users who clicked 'I went' but haven't second-confirmed via the 24h email yet. Past-due rows are unconfirmed after 24h — call them, or manually mark the visit if you have offline confirmation.",
          "点了「我去了」但 24h 邮件还没二次确认的用户。Past-due 表示已经超过 24h 还没确认 —— 你可以打电话或线下核对后手动标记。",
        )}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <SummaryTile
          label={t("Total pending", "总计待确认")}
          value={rows.length}
          t={t}
        />
        <SummaryTile
          label={t("Past 24h (past due)", "已超 24h")}
          value={pastDue.length}
          accent={pastDue.length > 0 ? "warn" : "ok"}
          t={t}
        />
        <SummaryTile
          label={t("Sign out", "登出")}
          value="—"
          onClick={onClear}
          t={t}
        />
      </div>
      {pastDue.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-sm border border-amber-500/30 bg-amber-500/5">
          <table className="w-full text-xs">
            <thead className="border-b border-amber-500/30 text-left uppercase tracking-wider text-amber-400">
              <tr>
                <th className="px-3 py-2">{t("Venue", "餐厅")}</th>
                <th className="px-3 py-2">{t("User", "用户")}</th>
                <th className="px-3 py-2">{t("Confirmed at", "声称时间")}</th>
                <th className="px-3 py-2 text-right">{t("Hours since", "已过小时")}</th>
              </tr>
            </thead>
            <tbody>
              {pastDue.slice(0, 30).map((r) => (
                <tr key={r.attribution_id} className="border-b border-amber-500/20 last:border-0">
                  <td className="px-3 py-2 font-medium">{r.venue_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.user_id.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(r.confirmed_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-400">
                    {Math.round(r.hours_since_confirm)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SummaryTile({
  label,
  value,
  accent,
  onClick,
  t,
}: {
  label: string;
  value: number | string;
  accent?: "ok" | "warn";
  onClick?: () => void;
  t: (en: string, zh: string) => string;
}) {
  const colorClass =
    accent === "warn" ? "border-amber-500/30 bg-amber-500/5" :
    accent === "ok" ? "border-emerald-500/30 bg-emerald-500/5" :
    "border-border bg-background/40";
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={`rounded-sm border px-4 py-3 ${colorClass} ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}