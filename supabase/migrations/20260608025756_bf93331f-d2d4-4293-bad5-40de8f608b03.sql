DROP POLICY IF EXISTS meet_insert_via_match ON public.meet_plans;
CREATE POLICY meet_plans_insert_service_role ON public.meet_plans FOR INSERT TO service_role WITH CHECK (true);