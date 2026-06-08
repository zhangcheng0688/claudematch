// src/components/shared/MatchCard.tsx
// One card in the match list. Used by /start (step 3) and the future /match list page.
//
// v3 — 5-axis compatibility analysis (resonance / complementarity / friction /
// chemistry / growth). Each axis is shown as a collapsible detail. The default
// view surfaces the headline + bio + resonance; clicking "Show deep analysis"
// reveals the rest.

import { ArrowRight, Loader2, Sparkles, ChevronDown, Heart, Zap, AlertTriangle, Sparkles as Stars, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useLang } from "@/lib/i18n";
import type { MatchRow } from "@/types/match";

export type MatchCardProps = {
  match: MatchRow;
  /** Whether this card is currently selected / expanded. */
  active: boolean;
  /** Show loading spinner on the action button. */
  loading: boolean;
  /** Triggered when the user clicks "Plan a meet-up". */
  onPlan: () => void;
};

export function MatchCard({ match, active, loading, onPlan }: MatchCardProps) {
  const { lang } = useLang();
  const t = (en: string, zh: string, yue?: string) =>
    lang === "yue" ? (yue ?? zh) : lang === "zh" ? zh : en;
  const d = match.details ?? {};
  const [expanded, setExpanded] = useState(false);

  const resonance = d.resonance ?? [];
  const complementarity = d.complementarity ?? [];
  const friction = d.friction ?? [];
  const chemistry = d.chemistry;
  const growth = d.growth;

  return (
    <div
      className={`rounded-sm border p-5 transition-all ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-semibold tracking-tight">
              {d.name ?? t("Match", "匹配对象", "配對對象")}
            </h3>
            {d.age && <span className="text-xs text-muted-foreground">{d.age}</span>}
            {d.city && <span className="text-xs text-muted-foreground">· {d.city}</span>}
          </div>
          {d.headline && (
            <p className="mt-1 text-sm text-muted-foreground">{d.headline}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-semibold text-gold-glow tabular-nums">
            {match.match_score.toFixed(1)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("Match", "匹配度", "配對度")}
          </div>
        </div>
      </div>

      {d.bio && <p className="mt-3 text-sm leading-relaxed">{d.bio}</p>}

      {d.shared_interests && d.shared_interests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {d.shared_interests.map((s) => (
            <span
              key={s}
              className="rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-xs"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* v3 Resonance (always shown — the strongest signal of fit) */}
      {resonance.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-primary">
            <Heart className="h-3 w-3" />
            {t("Where you resonate", "你们的共鸣", "你哋嘅共鳴")}
          </p>
          <ul className="space-y-1.5">
            {resonance.map((r, i) => (
              <li
                key={i}
                className="rounded-sm border-l-2 border-primary/60 bg-primary/5 px-3 py-2 text-sm leading-relaxed"
              >
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable deep analysis */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-sm border border-border bg-background/40 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        {expanded
          ? t("Hide deep analysis", "收起深度分析", "收起深度分析")
          : t("Show deep analysis", "展开深度分析", "展開深度分析")}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
          {/* Complementarity */}
          {complementarity.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                <Zap className="h-3 w-3" />
                {t("How you complement each other", "你们怎么互补", "你哋點互補")}
              </p>
              <ul className="space-y-1.5">
                {complementarity.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-sm border-l-2 border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm leading-relaxed"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Friction */}
          {friction.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-rose-400">
                <AlertTriangle className="h-3 w-3" />
                {t("Where you'll rub", "你们会摩擦的地方", "你哋會磨擦嘅地方")}
              </p>
              <ul className="space-y-1.5">
                {friction.map((f, i) => (
                  <li
                    key={i}
                    className="rounded-sm border-l-2 border-rose-500/40 bg-rose-500/5 px-3 py-2 text-sm leading-relaxed"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Chemistry */}
          {chemistry && (chemistry.first_10_minutes || chemistry.the_unspoken) && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-violet-400">
                <Stars className="h-3 w-3" />
                {t("First-meeting chemistry", "见面时的化学反应", "見面時嘅化學反應")}
              </p>
              {chemistry.first_10_minutes && (
                <p className="rounded-sm border-l-2 border-violet-500/40 bg-violet-500/5 px-3 py-2 text-sm leading-relaxed">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t("First 10 min", "前 10 分钟", "前 10 分鐘")}:{" "}
                  </span>
                  {chemistry.first_10_minutes}
                </p>
              )}
              {chemistry.the_unspoken && (
                <p className="mt-2 rounded-sm border-l-2 border-violet-500/40 bg-violet-500/5 px-3 py-2 text-sm italic leading-relaxed text-foreground/85">
                  <span className="text-[10px] font-medium uppercase tracking-wider not-italic text-muted-foreground">
                    {t("The unspoken", "说不出口的", "講唔出口嘅")}:{" "}
                  </span>
                  {chemistry.the_unspoken}
                </p>
              )}
            </div>
          )}

          {/* Growth */}
          {growth && (growth.in_6_months || growth.the_third_thing) && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-amber-400">
                <TrendingUp className="h-3 w-3" />
                {t("How you'll grow together", "6 个月后你们", "6 個月後你哋")}
              </p>
              {growth.in_6_months && (
                <p className="rounded-sm border-l-2 border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm leading-relaxed">
                  {growth.in_6_months}
                </p>
              )}
              {growth.the_third_thing && (
                <p className="mt-2 rounded-sm border-l-2 border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm italic leading-relaxed text-foreground/85">
                  <span className="text-[10px] font-medium uppercase tracking-wider not-italic text-muted-foreground">
                    {t("The third thing", "第三个东西", "第三樣嘢")}:{" "}
                  </span>
                  {growth.the_third_thing}
                </p>
              )}
            </div>
          )}

          {/* legacy single-line reason if v2 data is present */}
          {d.reason && resonance.length === 0 && (
            <p className="rounded-sm border-l-2 border-primary/60 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-primary">
                {t("Why", "为何匹配", "點解配對")}:{" "}
              </span>
              {d.reason}
            </p>
          )}
        </div>
      )}

      <div className="mt-4">
        <button
          onClick={onPlan}
          disabled={loading}
          className="group inline-flex h-10 items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {t("Plan a meet-up", "生成见面方案", "整見面方案")}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
