// src/components/shared/MatchCard.tsx
// One card in the match list. Used by /start (step 3) and the future /match list page.

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
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
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);
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
            <h3 className="text-lg font-semibold tracking-tight">{d.name ?? t("Match", "匹配对象")}</h3>
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
