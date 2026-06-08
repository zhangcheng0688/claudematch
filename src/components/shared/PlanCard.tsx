// src/components/shared/PlanCard.tsx
// Renders a DeepSeek-generated meet-up plan. Used by /start (step 3) and
// the /match/$id detail page.
//
// v2 — multi-plan with selectable A/B/C plans. Each plan shows venue options,
// activity design, time considerations, and exit strategy.

import { useState } from "react";
import {
  Calendar,
  MapPin,
  Sparkles,
  Clock,
  ChevronDown,
  Sun,
  Cloud,
  LogOut,
  Coffee,
  Users,
  Activity as ActivityIcon,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { MatchRow, MeetPlan, MeetPlanAi } from "@/types/match";

export type PlanCardProps = {
  plan: MeetPlan;
  match: MatchRow;
};

export function PlanCard({ plan, match }: PlanCardProps) {
  const { lang } = useLang();
  const t = (en: string, zh: string, yue?: string) =>
    lang === "yue" ? (yue ?? zh) : lang === "zh" ? zh : en;
  const ai = plan.plan_content?.ai ?? ({} as MeetPlanAi);

  // v2: multi-plan with selectable tab. Default to first plan.
  const multiPlan = ai.multi_plan ?? [];
  const [activePlanId, setActivePlanId] = useState<string>(
    multiPlan[0]?.id ?? "A",
  );
  const activePlan = multiPlan.find((p) => p.id === activePlanId) ?? multiPlan[0];

  // v1 compat: if no multi_plan, render old flat layout
  if (multiPlan.length === 0) {
    return (
      <div className="rounded-sm border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {t("AI meet-up plan with", "AI 见面方案 ·")} {match.details?.name}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {ai.when && <PlanRow icon={Calendar} label={t("When", "时间", "時間")} value={ai.when} />}
          {ai.where && (
            <PlanRow
              icon={MapPin}
              label={t("Where", "地点", "地點")}
              value={ai.location_intro ? `${ai.where} · ${ai.location_intro}` : ai.where}
            />
          )}
          {ai.dress_code && (
            <PlanRow
              icon={Sparkles}
              label={t("Dress code", "着装", "著裝")}
              value={ai.dress_code}
            />
          )}
          {ai.duration && (
            <PlanRow
              icon={Calendar}
              label={t("Duration", "时长", "時長")}
              value={ai.duration}
            />
          )}
          {ai.budget && (
            <PlanRow
              icon={Sparkles}
              label={t("Budget", "人均消费", "人均消費")}
              value={ai.budget}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {t("AI meet-up plan with", "AI 见面方案 ·", "AI 見面方案 ·")} {match.details?.name}
      </div>

      {/* Plan A/B/C tabs */}
      {multiPlan.length > 1 && (
        <div
          role="tablist"
          className="inline-flex h-10 items-center overflow-hidden rounded-sm border border-border bg-background/40 text-xs"
        >
          {multiPlan.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={activePlanId === p.id}
              onClick={() => setActivePlanId(p.id)}
              className={`h-full px-4 transition-colors ${
                activePlanId === p.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-mono text-[10px]">{p.id}</span>{" "}
              {p.label}
            </button>
          ))}
        </div>
      )}

      {activePlan && (
        <div className="rounded-sm border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 space-y-5">
          {activePlan.description && (
            <p className="text-sm italic text-foreground/85">
              {activePlan.description}
            </p>
          )}

          {/* Venue options */}
          {activePlan.venue_options.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {t("Where", "场所建议", "場所建議")}
              </p>
              <div className="space-y-2">
                {activePlan.venue_options.map((v, i) => (
                  <div
                    key={i}
                    className="rounded-sm border border-border bg-background/60 p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-foreground/95">
                        {v.name_example}
                      </p>
                      {v.price_level && (
                        <span className="text-[10px] text-muted-foreground">
                          {v.price_level}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/85">
                      {v.why}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      {v.district && <span>📍 {v.district}</span>}
                      {typeof v.distance_walking_minutes === "number" && (
                        <span>🚶 {v.distance_walking_minutes}m</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity design */}
          {activePlan.activity_design && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <ActivityIcon className="h-3 w-3" />
                {t("Activity flow", "活动流程", "活動流程")}
              </p>
              {activePlan.activity_design.why_this_activity && (
                <p className="mb-2 text-xs italic leading-relaxed text-foreground/85">
                  — {activePlan.activity_design.why_this_activity}
                </p>
              )}
              <div className="space-y-1.5">
                {activePlan.activity_design.flow["0_30_min"] && (
                  <PhaseRow
                    label={t("0-30 min", "前 30 分钟", "前 30 分鐘")}
                    text={activePlan.activity_design.flow["0_30_min"]}
                    color="emerald"
                  />
                )}
                {activePlan.activity_design.flow["30_60_min"] && (
                  <PhaseRow
                    label={t("30-60 min", "30-60 分钟", "30-60 分鐘")}
                    text={activePlan.activity_design.flow["30_60_min"]}
                    color="cyan"
                  />
                )}
                {activePlan.activity_design.flow["60_90_min"] && (
                  <PhaseRow
                    label={t("60-90 min", "60-90 分钟", "60-90 分鐘")}
                    text={activePlan.activity_design.flow["60_90_min"]}
                    color="violet"
                  />
                )}
              </div>
              {activePlan.activity_design.backup_if_bored && (
                <p className="mt-2 rounded-sm border border-amber-500/30 bg-amber-500/5 p-2 text-xs leading-relaxed text-foreground/90">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-amber-400">
                    {t("If it gets cold:", "如果冷场：", "如果冷場：")}
                  </span>{" "}
                  {activePlan.activity_design.backup_if_bored}
                </p>
              )}
            </div>
          )}

          {/* Time considerations */}
          {activePlan.time_considerations && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" />
                {t("Timing", "时间窗口", "時間窗口")}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {activePlan.time_considerations.best_window && (
                  <div className="rounded-sm border border-emerald-500/30 bg-emerald-500/5 p-2">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-400">
                      {t("Best", "最佳", "最佳")}
                    </p>
                    <p className="mt-0.5 text-sm">
                      {activePlan.time_considerations.best_window}
                    </p>
                  </div>
                )}
                {activePlan.time_considerations.avoid_window && (
                  <div className="rounded-sm border border-rose-500/30 bg-rose-500/5 p-2">
                    <p className="text-[10px] uppercase tracking-wider text-rose-400">
                      {t("Avoid", "避免", "避免")}
                    </p>
                    <p className="mt-0.5 text-sm">
                      {activePlan.time_considerations.avoid_window}
                    </p>
                  </div>
                )}
              </div>
              {activePlan.time_considerations.weather_check && (
                <p className="mt-2 text-[11px] italic text-muted-foreground">
                  <Cloud className="mr-1 inline h-3 w-3" />
                  {activePlan.time_considerations.weather_check}
                </p>
              )}
            </div>
          )}

          {/* Exit strategy */}
          {activePlan.exit_strategy && (
            <div className="rounded-sm border border-sky-500/30 bg-sky-500/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-sky-400">
                <LogOut className="h-3 w-3" />
                {t("If it doesn't click", "如果感觉不对", "如果感覺唔啱")}
              </p>
              {activePlan.exit_strategy.natural_close && (
                <p className="text-sm leading-relaxed">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t("How to close", "怎么结束", "點結束")}
                  </span>{" "}
                  {activePlan.exit_strategy.natural_close}
                </p>
              )}
              {activePlan.exit_strategy.followup_anchor && (
                <p className="mt-1 text-sm leading-relaxed">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t("Next-step anchor", "下一步约定", "下一步約定")}
                  </span>{" "}
                  {activePlan.exit_strategy.followup_anchor}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
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

function PhaseRow({
  label,
  text,
  color,
}: {
  label: string;
  text: string;
  color: "emerald" | "cyan" | "violet";
}) {
  const colorClass = {
    emerald: "border-emerald-500/40 bg-emerald-500/5",
    cyan: "border-cyan-500/40 bg-cyan-500/5",
    violet: "border-violet-500/40 bg-violet-500/5",
  }[color];
  return (
    <div className={`rounded-sm border-l-2 ${colorClass} px-3 py-2`}>
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <p className="mt-0.5 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
