
-- Add columns to referrals table for provider-facing acceptance flow
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referral_method text NOT NULL DEFAULT 'Email',
  ADD COLUMN IF NOT EXISTS token text UNIQUE,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS responded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS response_notes text;

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS idx_referrals_token ON public.referrals(token) WHERE token IS NOT NULL;

-- Allow anonymous users to read referrals by token (for public acceptance page)
CREATE POLICY "referrals_public_token_select" ON public.referrals
  FOR SELECT TO anon
  USING (token IS NOT NULL);

-- Allow anonymous users to update referral status via token
CREATE POLICY "referrals_public_token_update" ON public.referrals
  FOR UPDATE TO anon
  USING (token IS NOT NULL)
  WITH CHECK (token IS NOT NULL);
