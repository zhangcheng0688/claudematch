// src/lib/api/_scheduled-emails.server.ts
// Helpers for scheduling post-match follow-up emails and meet-feedback prompts.
// The actual sending is performed by a cron hitting /api/cron/send-scheduled-emails.

export type FollowUpPhase = "day_1" | "week_1" | "month_1";

export function scheduleFollowUpEmails(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  matchId: string,
  strategy: { day_1?: string; week_1?: string; month_1?: string },
  otherName: string,
  scenario: string,
) {
  const now = new Date();
  const slots: Array<{ phase: FollowUpPhase; hours: number; label: string }> = [
    { phase: "day_1", hours: 18, label: "今晚" },
    { phase: "week_1", hours: 24 * 5, label: "第一周" },
    { phase: "month_1", hours: 24 * 28, label: "第一个月" },
  ];

  const inserts = slots
    .filter((s) => typeof strategy[s.phase] === "string" && strategy[s.phase]!.trim().length > 0)
    .map((s) => {
      const scheduledAt = new Date(now.getTime() + s.hours * 60 * 60 * 1000);
      return {
        user_id: userId,
        match_id: matchId,
        kind: `follow_up_${s.phase}` as const,
        scheduled_at: scheduledAt.toISOString(),
        status: "pending",
        payload: {
          phase: s.phase,
          label: s.label,
          advice: strategy[s.phase],
          other_name: otherName,
          scenario,
        },
      };
    });

  if (inserts.length === 0) return Promise.resolve();
  return (supabase.from as any)("scheduled_emails").insert(inserts);
}

export function scheduleRematchEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  scenario: string,
) {
  const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return (supabase.from as any)("scheduled_emails").insert({
    user_id: userId,
    kind: "rematch",
    scheduled_at: scheduledAt.toISOString(),
    status: "pending",
    payload: { scenario },
  });
}

export function scheduleMeetFeedbackEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  matchId: string,
  meetPlanId: string,
  otherName: string,
) {
  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return (supabase.from as any)("scheduled_emails").insert({
    user_id: userId,
    match_id: matchId,
    kind: "meet_feedback_24h",
    scheduled_at: scheduledAt.toISOString(),
    status: "pending",
    payload: {
      meet_plan_id: meetPlanId,
      other_name: otherName,
    },
  });
}
