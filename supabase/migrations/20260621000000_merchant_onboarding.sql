-- Merchant onboarding (P1-5).
-- Lets restaurants self-register, receive an approval token, and view
-- their own attribution dashboard without needing a full auth.users row.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS merchant_email TEXT,
  ADD COLUMN IF NOT EXISTS merchant_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (onboarding_status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS venues_merchant_token_idx ON public.venues(merchant_token);
CREATE INDEX IF NOT EXISTS venues_onboarding_status_idx ON public.venues(onboarding_status);
