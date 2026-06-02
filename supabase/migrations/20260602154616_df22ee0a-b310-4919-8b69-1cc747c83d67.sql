
-- 1. profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 2. user_authorizations
CREATE TABLE public.user_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business boolean NOT NULL DEFAULT false,
  dating boolean NOT NULL DEFAULT false,
  partner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_authorizations TO authenticated;
GRANT ALL ON public.user_authorizations TO service_role;
ALTER TABLE public.user_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_own" ON public.user_authorizations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "auth_insert_own" ON public.user_authorizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_update_own" ON public.user_authorizations FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 3. user_profiles (AI 画像)
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_profiles_user_id_idx ON public.user_profiles(user_id);
GRANT SELECT, INSERT ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uprof_select_own" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "uprof_insert_own" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. matches
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matched_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_score numeric(5,2) NOT NULL DEFAULT 0,
  scenario text NOT NULL DEFAULT 'dating',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX matches_user_id_idx ON public.matches(user_id);
GRANT SELECT, INSERT ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_select_own" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "matches_insert_own" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. meet_plans
CREATE TABLE public.meet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  plan_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meet_plans_match_id_idx ON public.meet_plans(match_id);
GRANT SELECT, INSERT ON public.meet_plans TO authenticated;
GRANT ALL ON public.meet_plans TO service_role;
ALTER TABLE public.meet_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meet_select_via_match" ON public.meet_plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.user_id = auth.uid()));
CREATE POLICY "meet_insert_via_match" ON public.meet_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.user_id = auth.uid()));

-- 6. waitlist (anonymous insert allowed via server fn using admin client; no anon SELECT)
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.waitlist TO service_role;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
-- 不开放 anon/authenticated 直接访问;服务端使用 service_role 写入与统计

-- updated_at 触发器
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER user_auth_set_updated_at BEFORE UPDATE ON public.user_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 新用户注册自动建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
