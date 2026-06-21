// src/components/shared/MatchCard.tsx
// One card in the match list. Used by /start (step 3) and the future /match list page.
//
// v3 — 5-axis compatibility analysis (resonance / complementarity / friction /
// chemistry / growth). Each axis is shown as a collapsible detail. The default
// view surfaces the headline + bio + resonance; clicking "Show deep analysis"
// reveals the rest.
//
// v4 — adds paradox_resolution, timeline, conversation_arc, follow_up_strategy.
// Plus compatibility_breakdown (5 sub-scores).

import {
  ArrowRight,
  Loader2,
  Sparkles,
  ChevronDown,
  Heart,
  Zap,
  AlertTriangle,
  Sparkles as Stars,
  TrendingUp,
  Clock,
  MessageCircle,
} from "lucide-react";
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
  const paradoxResolution = d.paradox_resolution;
  const timeline = d.timeline ?? [];
  const conversationArc = d.conversation_arc;
  const followUp = d.follow_up_strategy;
  const breakdown = d.compatibility_breakdown;

  return (
    <div
      className={`rounded-sm border p-5 transition-all ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* 漏洞 D: persona avatar. For AI personas (is_real_user=false)
                we generate a deterministic DiceBear URL from the persona's
                stable id so the same persona always shows the same face
                (key to making them feel like real people across sessions).
                For real users we'd swap to a real image_url when we have
                one — the schema already has it. */}
            {d.is_real_user === false && d.name && (
              <img
                src={`https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(d.name)}&backgroundColor=transparent`}
                alt={d.name}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full border border-violet-500/30 bg-violet-500/5"
                loading="lazy"
              />
            )}
            <h3 className="text-lg font-semibold tracking-tight">
              {d.name ?? t("Match", "匹配对象", "配對對象")}
            </h3>
            {d.age && <span className="text-xs text-muted-foreground">{d.age}</span>}
            {d.city && <span className="text-xs text-muted-foreground">· {d.city}</span>}
            {/* P0 cold-start: AI personas are openly disclosed in the
                UI as "AI 角色" — never pretend to be a real user. */}
            {d.is_real_user === false && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-400"
                title={t(
                  "AI-generated character to show you the linQ experience until real matches are available.",
                  "AI 生成的角色，用于在你周围暂无真人匹配时展示 linQ 的完整体验。",
                  "AI 角色，用喺你周圍未有真人配對時展示 linQ 嘅完整體驗。",
                )}
              >
                <Sparkles className="h-2.5 w-2.5" />
                {t("AI persona", "AI 角色", "AI 角色")}
              </span>
            )}
          </div>
          {d.headline && <p className="mt-1 text-sm text-muted-foreground">{d.headline}</p>}
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

      {/* v4 Compatibility breakdown bars */}
      {breakdown && (
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {(
            [
              { key: "resonance", label: t("Res", "共鸣", "共鳴"), color: "bg-primary" },
              { key: "complementarity", label: t("Comp", "互补", "互補"), color: "bg-emerald-500" },
              {
                key: "friction_risk",
                label: t("Risk", "摩擦", "摩擦嘅地方"),
                color: "bg-rose-500",
              },
              { key: "chemistry", label: t("Chem", "反应", "反應"), color: "bg-violet-500" },
              { key: "growth_potential", label: t("Grow", "成长", "成長"), color: "bg-amber-500" },
            ] as const
          ).map(({ key, label, color }) => {
            const v = Math.max(0, Math.min(100, (breakdown as Record<string, number>)[key] ?? 0));
            return (
              <div key={key} className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="mx-auto mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                  <div className={`h-full ${color}`} style={{ width: `${v}%` }} />
                </div>
                <div className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">{v}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* v3 Resonance (always shown) */}
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

      {/* v4 Paradox resolution — always shown, the strongest "AI gets us" signal */}
      {paradoxResolution && paradoxResolution.a_paradox && (
        <div className="mt-4 rounded-sm border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-amber-400">
            {t("How they ease your paradox", "ta 怎么松动你的矛盾", "佢點鬆動你嘅矛盾")}
          </p>
          <div className="mt-2 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("Your paradox", "你的矛盾", "你嘅矛盾")}
            </p>
            <p className="text-sm text-foreground/95">{paradoxResolution.a_paradox}</p>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-emerald-400">
              {t("How they resolve it", "ta 怎么松动", "佢點鬆動")}
            </p>
            <p className="text-sm text-foreground/95">{paradoxResolution.how_b_resolves}</p>
            {paradoxResolution.why && (
              <p className="mt-1 text-[11px] italic text-muted-foreground">
                — {paradoxResolution.why}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Expandable deep analysis */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-sm border border-border bg-background/40 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        {expanded
          ? t("Hide deep analysis", "收起深度分析", "收埋深度分析")
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

          {/* v4 Conversation arc — 30-min first-meeting flow */}
          {conversationArc && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-cyan-400">
                <MessageCircle className="h-3 w-3" />
                {t("The 30-minute first meeting", "第一次见面的 30 分钟", "第一次見面嘅 30 分鐘")}
              </p>
              <div className="space-y-1.5">
                {(
                  [
                    {
                      phase: "0-5",
                      key: "opening" as const,
                      label: t("Opening", "前 5 分钟", "前 5 分鐘"),
                      color: "border-cyan-500/40 bg-cyan-500/5",
                    },
                    {
                      phase: "5-15",
                      key: "warming" as const,
                      label: t("Warming", "5-15 分钟", "5-15 分鐘"),
                      color: "border-cyan-500/40 bg-cyan-500/5",
                    },
                    {
                      phase: "15-25",
                      key: "depth" as const,
                      label: t("Depth", "15-25 分钟", "15-25 分鐘"),
                      color: "border-cyan-500/40 bg-cyan-500/5",
                    },
                    {
                      phase: "25-30",
                      key: "closing" as const,
                      label: t("Closing", "25-30 分钟", "25-30 分鐘"),
                      color: "border-cyan-500/40 bg-cyan-500/5",
                    },
                  ] as const
                ).map(({ phase, key, label, color }) => {
                  const text = conversationArc[key];
                  if (!text) return null;
                  return (
                    <div key={phase} className={`rounded-sm border-l-2 ${color} px-3 py-2`}>
                      <span className="mr-2 text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                        {phase}m
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {label}:
                      </span>
                      <p className="mt-0.5 text-sm leading-relaxed">{text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Growth + 6 months */}
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

          {/* v4 Timeline */}
          {timeline.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-indigo-400">
                <Clock className="h-3 w-3" />
                {t("Relationship timeline", "关系时间线", "關係時間線")}
              </p>
              <div className="space-y-2">
                {timeline.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-sm border-l-2 border-indigo-500/40 bg-indigo-500/5 px-3 py-2"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wider text-indigo-300">
                      {p.phase === "3_months"
                        ? t("3 months", "3 个月后", "3 個月後")
                        : p.phase === "6_months"
                          ? t("6 months", "6 个月后", "6 個月後")
                          : t("1 year", "1 年后", "1 年後")}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">{p.what_happens}</p>
                    {p.signals_to_watch && (
                      <p className="mt-1 text-[11px] italic text-muted-foreground">
                        {t("Watch:", "关注：", "關注：")} {p.signals_to_watch}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* v4 Follow-up */}
          {followUp && (followUp.day_1 || followUp.week_1 || followUp.month_1) && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                {t("After the meeting", "见面后怎么跟进", "見面後點跟進")}
              </p>
              <div className="space-y-1.5">
                {followUp.day_1 && (
                  <div className="rounded-sm border-l-2 border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                      {t("Day 1", "当晚", "當晚")}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed">{followUp.day_1}</p>
                  </div>
                )}
                {followUp.week_1 && (
                  <div className="rounded-sm border-l-2 border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                      {t("Week 1", "第一周", "第一週")}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed">{followUp.week_1}</p>
                  </div>
                )}
                {followUp.month_1 && (
                  <div className="rounded-sm border-l-2 border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                      {t("Month 1", "第一个月", "第一個月")}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed">{followUp.month_1}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* legacy single-line reason if v2 data is present */}
          {d.reason && resonance.length === 0 && (
            <p className="rounded-sm border-l-2 border-primary/60 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-primary">{t("Why", "为何匹配", "點解配對")}: </span>
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
