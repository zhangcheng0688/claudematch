// src/components/shared/PlanCard.tsx
// Renders a DeepSeek-generated meet-up plan. Used by /start (step 3) and the
// future /match/$id detail page.

import { Calendar, MapPin, Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { MatchRow, MeetPlan } from "@/types/match";

export type PlanCardProps = {
  plan: MeetPlan;
  match: MatchRow;
};

export function PlanCard({ plan, match }: PlanCardProps) {
  const { lang } = useLang();
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);
  const p = plan.plan_content?.ai ?? {};

  return (
    <div className="rounded-sm border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 space-y-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        {t("AI meet-up plan with", "AI 见面方案 ·")} {match.details?.name}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {p.when && <PlanRow icon={Calendar} label={t("When", "时间")} value={p.when} />}
        {p.where && (
          <PlanRow
            icon={MapPin}
            label={t("Where", "地点")}
            value={p.location_intro ? `${p.where} · ${p.location_intro}` : p.where}
          />
        )}
        {p.dress_code && (
          <PlanRow icon={Sparkles} label={t("Dress code", "着装")} value={p.dress_code} />
        )}
        {p.duration && (
          <PlanRow icon={Calendar} label={t("Duration", "时长")} value={p.duration} />
        )}
        {p.budget && (
          <PlanRow icon={Sparkles} label={t("Budget", "人均消费")} value={p.budget} />
        )}
      </div>
      {p.icebreakers && p.icebreakers.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Icebreakers", "破冰开场话术")}</div>
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
      {p.pitfalls && p.pitfalls.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Pitfalls to avoid", "沟通避坑提醒")}</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {p.pitfalls.map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">·</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {p.highlights && p.highlights.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("Why you match", "双方适配亮点")}</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {p.highlights.map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">★</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
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
