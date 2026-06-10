-- 20260610210000_reconciliation_views.sql
--
-- 漏洞 F：返点对账的 query 完全没设计。meetup_attributions 表一直在
-- 写数据但没人能查到。这一迁移加 4 个 SQL view + 1 个返点计算函数，
-- 给出 founder / 餐厅对账需要的"按餐厅聚合"视图。
--
-- 视图设计原则：
--   1. 只读 — 永远不通过 view 写数据，attribution 写入走 endpoint
--   2. 按月聚合 — 对账是月度业务，view 第一层按 year_month 分组
--   3. 包含"valid_visit"信号 — BUG 漏洞 B 修复后，confirm_i_went 要
--      经过 24h 二次确认才升级为 valid_visit。本 view 已经预留这个
--      字段，但漏洞 B 实施前所有 confirm_i_went 都算 candidate。
--
-- 用户（founder）会通过 Supabase Studio 直接 SELECT 这些 view；
-- 未来可能写一个简易 admin 页（漏洞 M）用 service_role 包装后
-- 调 admin/reconciliation 接口（已经存在，requireServiceRole）。

-- ────────────────────────────────────────────────────────────────────────────
-- View 1: v_user_visit_summary
--   每个 user × venue × 月份 的 visit 状态聚合
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_user_visit_summary AS
SELECT
  user_id,
  venue_id,
  DATE_TRUNC('month', created_at) AS year_month,
  -- 'view' = 用户看了 booking modal (top of funnel)
  BOOL_OR(action = 'view_details') AS viewed_modal,
  -- 'tap_call' / 'tap_navigate' = 用户点击了具体的预订动作
  BOOL_OR(action = 'tap_call') AS tapped_call,
  BOOL_OR(action = 'tap_navigate') AS tapped_navigate,
  -- 'confirm_i_went' = 用户主动说"我去了" (未经验证)
  BOOL_OR(action = 'confirm_i_went') AS claimed_i_went,
  -- 'valid_visit' = 经过 24h 二次确认 (漏洞 B 实施后填这个)
  -- 现在永远 false，漏洞 B 实施后改成跟 confirm_i_went + email_confirmed 的组合
  BOOL_OR(action = 'confirm_i_went' AND (metadata->>'email_confirmed')::boolean) AS valid_visit,
  COUNT(*) FILTER (WHERE action = 'view_details') AS view_count,
  COUNT(*) FILTER (WHERE action = 'tap_call') AS call_count,
  COUNT(*) FILTER (WHERE action = 'tap_navigate') AS navigate_count,
  COUNT(*) FILTER (WHERE action = 'confirm_i_went') AS claim_count,
  -- 第一次 + 最后一次 互动时间
  MIN(created_at) AS first_seen_at,
  MAX(created_at) AS last_seen_at
FROM public.meetup_attributions
WHERE venue_id IS NOT NULL
GROUP BY user_id, venue_id, DATE_TRUNC('month', created_at);

COMMENT ON VIEW public.v_user_visit_summary IS
  'One row per (user, venue, month). Powers both per-user history and per-restaurant aggregation.';

-- ────────────────────────────────────────────────────────────────────────────
-- View 2: v_venue_monthly_reconciliation
--   每个 venue × 月份 的返点对账核心数据
--   这是给餐厅开月账单时直接 SELECT 的 view
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_venue_monthly_reconciliation AS
SELECT
  v.id AS venue_id,
  v.name AS venue_name,
  v.city,
  v.district,
  v.commission_pct,
  v.booking_method,
  v.is_active AS venue_is_active,
  DATE_TRUNC('month', a.created_at) AS year_month,
  -- 唯一用户数 (同一用户多次点击去重)
  COUNT(DISTINCT a.user_id) AS unique_users,
  -- 各种 action 的总次数
  COUNT(*) FILTER (WHERE a.action = 'view_details') AS total_views,
  COUNT(*) FILTER (WHERE a.action = 'tap_call') AS total_call_taps,
  COUNT(*) FILTER (WHERE a.action = 'tap_navigate') AS total_navigate_taps,
  COUNT(*) FILTER (WHERE a.action = 'confirm_i_went') AS total_claims,
  -- valid_visit 数 (目前是 0，B 实施后开始累计)
  COUNT(*) FILTER (
    WHERE a.action = 'confirm_i_went'
    AND (a.metadata->>'email_confirmed')::boolean = true
  ) AS total_valid_visits,
  -- 返点计算（仅 valid_visit 计费）
  -- 公式: valid_visits * avg_per_visit_estimate * commission_pct
  -- 这里我们先存中间值，让 admin/reconciliation 接口决定最终返点金额
  -- (avg_per_visit_estimate 来自 venue metadata 或全局配置)
  -- 暂时返回 0，admin 接口会做最终计算
  0::numeric AS estimated_rebate_cny
FROM public.venues v
LEFT JOIN public.meetup_attributions a
  ON a.venue_id = v.id
GROUP BY v.id, v.name, v.city, v.district, v.commission_pct, v.booking_method, v.is_active, DATE_TRUNC('month', a.created_at);

COMMENT ON VIEW public.v_venue_monthly_reconciliation IS
  'Per-venue × month reconciliation report. The single view that powers the monthly invoice to restaurants.';

-- ────────────────────────────────────────────────────────────────────────────
-- View 3: v_user_journey_funnel
--   每个 user 的完整 journey 漏斗 (供 founder dashboard / seed user 复盘)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_user_journey_funnel AS
SELECT
  a.user_id,
  a.match_id,
  m.scenario,
  -- 整体 journey 标志位
  BOOL_OR(a.action = 'view_details') AS viewed_modal,
  BOOL_OR(a.action IN ('tap_call', 'tap_navigate')) AS took_booking_action,
  BOOL_OR(a.action = 'confirm_i_went') AS claimed_i_went,
  BOOL_OR(
    a.action = 'confirm_i_went'
    AND (a.metadata->>'email_confirmed')::boolean = true
  ) AS valid_visit,
  -- 第一个互动 (top of funnel)
  MIN(a.created_at) AS funnel_top_at,
  -- 最后一个 action
  MAX(a.created_at) AS funnel_last_at
FROM public.meetup_attributions a
LEFT JOIN public.matches m ON m.id = a.match_id
WHERE a.match_id IS NOT NULL
GROUP BY a.user_id, a.match_id, m.scenario;

COMMENT ON VIEW public.v_user_journey_funnel IS
  'One row per (user, match). Shows whether the user completed the funnel.';

-- ────────────────────────────────────────────────────────────────────────────
-- View 4: v_pending_confirmations
--   漏洞 B 实施后这个 view 才有数据：列出"用户已 confirm_i_went 但还没
--   收到 24h 二次确认邮件/未点击确认链接"的 record
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_pending_confirmations AS
SELECT
  a.id AS attribution_id,
  a.user_id,
  a.venue_id,
  v.name AS venue_name,
  a.created_at AS confirmed_at,
  EXTRACT(EPOCH FROM (now() - a.created_at)) / 3600 AS hours_since_confirm,
  -- 24h 窗口还没到的不算 pending；超过 24h 且没确认的 = pending
  CASE
    WHEN now() - a.created_at > INTERVAL '24 hours'
      AND (a.metadata->>'email_confirmed')::boolean IS DISTINCT FROM true
    THEN 'past_due'
    ELSE 'within_window'
  END AS confirmation_status
FROM public.meetup_attributions a
JOIN public.venues v ON v.id = a.venue_id
WHERE a.action = 'confirm_i_went'
  AND (a.metadata->>'email_confirmed')::boolean IS DISTINCT FROM true;

COMMENT ON VIEW public.v_pending_confirmations IS
  'List of confirm_i_went events that have not yet been second-confirmed via the 24h email. Drives 漏洞 B follow-up logic.';

-- ────────────────────────────────────────────────────────────────────────────
-- Helper function: get_venue_summary_for_founder
--   单一函数返回 founder dashboard 需要的"今日 / 本周 / 本月"聚合
--   比写 3 个 view 更直观 (避免 founder 写一堆 date filter)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_funnel_summary(since_days INT DEFAULT 30)
RETURNS TABLE (
  scope TEXT,
  total_users BIGINT,
  total_matches BIGINT,
  total_plan_views BIGINT,
  total_booking_taps BIGINT,
  total_claims BIGINT,
  total_valid_visits BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'all_time'::TEXT AS scope,
    (SELECT COUNT(DISTINCT user_id) FROM public.meetup_attributions),
    (SELECT COUNT(*) FROM public.matches),
    (SELECT COUNT(*) FILTER (WHERE action = 'view_details') FROM public.meetup_attributions),
    (SELECT COUNT(*) FILTER (WHERE action IN ('tap_call', 'tap_navigate')) FROM public.meetup_attributions),
    (SELECT COUNT(*) FILTER (WHERE action = 'confirm_i_went') FROM public.meetup_attributions),
    (SELECT COUNT(*) FILTER (
      WHERE action = 'confirm_i_went'
      AND (metadata->>'email_confirmed')::boolean = true
    ) FROM public.meetup_attributions)
  UNION ALL
  SELECT
    ('last_' || since_days || '_days')::TEXT,
    (SELECT COUNT(DISTINCT user_id) FROM public.meetup_attributions WHERE created_at > now() - (since_days || ' days')::INTERVAL),
    (SELECT COUNT(*) FROM public.matches WHERE created_at > now() - (since_days || ' days')::INTERVAL),
    (SELECT COUNT(*) FROM public.meetup_attributions WHERE action = 'view_details' AND created_at > now() - (since_days || ' days')::INTERVAL),
    (SELECT COUNT(*) FROM public.meetup_attributions WHERE action IN ('tap_call', 'tap_navigate') AND created_at > now() - (since_days || ' days')::INTERVAL),
    (SELECT COUNT(*) FROM public.meetup_attributions WHERE action = 'confirm_i_went' AND created_at > now() - (since_days || ' days')::INTERVAL),
    (SELECT COUNT(*) FROM public.meetup_attributions WHERE action = 'confirm_i_went' AND (metadata->>'email_confirmed')::boolean = true AND created_at > now() - (since_days || ' days')::INTERVAL);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_funnel_summary IS
  'Returns 2 rows: all-time totals + last-N-days totals. The single function founder queries for a daily dashboard.';