// src/components/shared/PlanCard.tsx
// Renders a DeepSeek-generated meet-up plan. Used by /start (step 3) and
// the /match/$id detail page.
//
// v3 — venue-grounded. Each venue_option now carries a `venue_id`
// (UUID into the `venues` table). We render the full venue row
// (name, district, address, price, rating, tel) instead of the
// free-text `name_example` the LLM used to invent. Tapping a venue
// opens a "Booking modal" with three one-tap actions (call /
// navigate / confirm-attended) — none of them jump to an external
// site, matching the product decision to keep the user inside linQ
// from plan to action.

import { useEffect, useState } from "react";
import {
  Calendar,
  MapPin,
  Sparkles,
  Clock,
  Activity as ActivityIcon,
  Cloud,
  LogOut,
  Phone,
  Navigation,
  CheckCircle2,
  X,
  Star,
  Users,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { authedFetch } from "@/lib/api/authed-fetch";
import type { MatchRow, MeetPlan, MeetPlanAi } from "@/types/match";

type VenueRow = {
  id: string;
  name: string;
  city: string;
  district: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  cuisine_tags: string[];
  vibe_tags: string[];
  price_per_person: number | null;
  rating: number | null;
  tel: string | null;
  opening_hours: string | null;
  photos: string[];
  booking_method: "walk_in" | "phone" | "wechat";
  commission_pct: number;
};

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

  // Venue lookup table (id -> row). Comes from plan_content.venue_lookup
  // (server pre-resolved at plan-generation time). If the user opens the
  // booking modal after a page refresh, the lookup might be stale — we
  // re-fetch in the modal if needed.
  const venueLookup: Record<string, VenueRow> =
    (plan.plan_content as { venue_lookup?: Record<string, VenueRow> })?.venue_lookup ?? {};

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

          {/* Venue options — now backed by the venues table */}
          {activePlan.venue_options.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {t("Where", "场所建议", "場所建議")}
              </p>
              <div className="space-y-2">
                {activePlan.venue_options.map((v, i) => {
                  const venue = v.venue_id ? venueLookup[v.venue_id] : undefined;
                  return (
                    <VenueCard
                      key={i}
                      venue={venue}
                      fallbackName={undefined}
                      why={v.why}
                      distanceWalkingMin={v.distance_walking_minutes}
                      matchId={match.id}
                      lang={lang}
                    />
                  );
                })}
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

// ─────────────────────────────────────────────────────────────────────────────
// VenueCard — one real venue row (or a placeholder if the LLM didn't bind one)
// ─────────────────────────────────────────────────────────────────────────────

function VenueCard({
  venue,
  fallbackName,
  why,
  distanceWalkingMin,
  matchId,
  lang,
}: {
  venue: VenueRow | undefined;
  fallbackName?: string;
  why?: string;
  distanceWalkingMin?: number;
  matchId: string;
  lang: "en" | "zh" | "yue";
}) {
  const t = (en: string, zh: string, yue?: string) =>
    lang === "yue" ? (yue ?? zh) : lang === "zh" ? zh : en;
  const [modalOpen, setModalOpen] = useState(false);

  // The card is "tappable" only if we have a venue_id (otherwise
  // it's an LLM fallback like "some nice place in X district" and
  // the booking flow doesn't make sense).
  const tappable = Boolean(venue?.id);

  return (
    <>
      <button
        type="button"
        disabled={!tappable}
        onClick={() => setModalOpen(true)}
        className={`block w-full rounded-sm border border-border bg-background/60 p-3 text-left transition-colors ${
          tappable
            ? "hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
            : "cursor-default opacity-60"
        }`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground/95">
            {venue?.name ?? fallbackName ?? t("Venue TBD", "待定", "待定")}
          </p>
          {typeof venue?.price_per_person === "number" && (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              ¥{venue.price_per_person}/人
            </span>
          )}
        </div>
        {why && (
          <p className="mt-1 text-xs leading-relaxed text-foreground/85">{why}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          {venue?.district && <span>📍 {venue.district}</span>}
          {venue?.cuisine_tags && venue.cuisine_tags.length > 0 && (
            <span>🍽️ {venue.cuisine_tags.slice(0, 3).join(" · ")}</span>
          )}
          {typeof venue?.rating === "number" && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {venue.rating.toFixed(1)}
            </span>
          )}
          {typeof distanceWalkingMin === "number" && (
            <span>🚶 {distanceWalkingMin}m</span>
          )}
        </div>
        {tappable && (
          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] font-medium text-primary">
            {t("Book this spot →", "预订这家 →", "預訂呢間 →")}
          </div>
        )}
      </button>

      {tappable && venue && (
        <BookingModal
          venue={venue}
          matchId={matchId}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          lang={lang}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BookingModal — the user's last mile. 3 actions, none of which leave
// linQ. We use native tel: / maps: URL schemes for the actual call /
// navigation, but we track both clicks server-side for the future
// 返点 reconciliation.
// ─────────────────────────────────────────────────────────────────────────────

function BookingModal({
  venue,
  matchId,
  open,
  onClose,
  lang,
}: {
  venue: VenueRow;
  matchId: string;
  open: boolean;
  onClose: () => void;
  lang: "en" | "zh" | "yue";
}) {
  const t = (en: string, zh: string, yue?: string) =>
    lang === "yue" ? (yue ?? zh) : lang === "zh" ? zh : en;
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Re-fetch fresh venue data if the modal opens stale (e.g. user
  // opened it after a page refresh, and the plan_content.venue_lookup
  // was older than 1h). We rely on the lookup only being passed in if
  // it was recent.
  useEffect(() => {
    if (!open || !venue?.id) return;
    authedFetch("/api/venues/track", {
      method: "POST",
      body: JSON.stringify({
        match_id: matchId,
        venue_id: venue.id,
        action: "view_details",
      }),
    }).catch(() => {
      /* non-fatal: tracking is best-effort */
    });
  }, [open, venue?.id, matchId]);

  if (!open) return null;

  const navigateUrl =
    venue.lat && venue.lng
      ? `https://uri.amap.com/navigation?to=${venue.lng},${venue.lat},${encodeURIComponent(venue.name)}&mode=car&policy=1&src=linQ&coordinate=gaode`
      : null;

  const onCall = () => {
    if (!venue.tel) return;
    authedFetch("/api/venues/track", {
      method: "POST",
      body: JSON.stringify({ match_id: matchId, venue_id: venue.id, action: "tap_call" }),
    }).catch(() => {});
    window.location.href = `tel:${venue.tel}`;
  };

  const onNavigate = () => {
    if (!navigateUrl) return;
    authedFetch("/api/venues/track", {
      method: "POST",
      body: JSON.stringify({ match_id: matchId, venue_id: venue.id, action: "tap_navigate" }),
    }).catch(() => {});
    window.location.href = navigateUrl;
  };

  const onConfirmIwent = async () => {
    setConfirming(true);
    try {
      await authedFetch("/api/venues/track", {
        method: "POST",
        body: JSON.stringify({ match_id: matchId, venue_id: venue.id, action: "confirm_i_went" }),
      });
      setConfirmed(true);
    } catch {
      setConfirming(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-sm border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-border p-4">
          <div className="flex-1">
            <h2
              id="booking-modal-title"
              className="font-display text-lg font-semibold text-foreground"
            >
              {venue.name}
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {venue.district ? `${venue.district} · ` : ""}
              {venue.city}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close", "关闭", "關閉")}
            className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4 text-sm">
          {venue.address && (
            <p className="text-foreground/85">📍 {venue.address}</p>
          )}
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {typeof venue.price_per_person === "number" && (
              <span className="rounded-full border border-border bg-background/40 px-2 py-0.5">
                ¥{venue.price_per_person}/人
              </span>
            )}
            {typeof venue.rating === "number" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2 py-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {venue.rating.toFixed(1)}
              </span>
            )}
            {venue.cuisine_tags.slice(0, 3).map((c) => (
              <span key={c} className="rounded-full border border-border bg-background/40 px-2 py-0.5">
                {c}
              </span>
            ))}
          </div>
          {venue.opening_hours && (
            <p className="text-[11px] text-muted-foreground">🕐 {venue.opening_hours}</p>
          )}
        </div>

        <div className="grid gap-2 border-t border-border p-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCall}
            disabled={!venue.tel}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-border bg-background/40 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Phone className="h-4 w-4" />
            {venue.tel ? t("Call to book", "电话预订", "電話預訂") : t("No phone listed", "无电话", "無電話")}
          </button>
          <button
            type="button"
            onClick={onNavigate}
            disabled={!navigateUrl}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-primary/40 bg-primary/10 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Navigation className="h-4 w-4" />
            {t("Navigate", "导航", "導航")}
          </button>
        </div>

        <div className="border-t border-border bg-secondary/30 p-4">
          {confirmed ? (
            <p className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              {t(
                "Marked — enjoy!",
                "已标记，祝玩得开心！",
                "已標記，玩得開心啲！",
              )}
            </p>
          ) : (
            <button
              type="button"
              onClick={onConfirmIwent}
              disabled={confirming}
              className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {confirming
                ? t("Saving…", "保存中…", "儲存緊…")
                : t("I went (mark as done)", "我去了（标记完成）", "我去咗（標記完成）")}
            </button>
          )}
          <p className="mt-2 text-[10px] text-muted-foreground">
            {t(
              "Marking helps linQ improve future plans. We never share your data.",
              "标记能帮 linQ 改进方案。我们绝不分享你的数据。",
              "標記能幫 linQ 改進方案。我哋絕對唔會分享你嘅資料。",
            )}
          </p>
        </div>
      </div>
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
