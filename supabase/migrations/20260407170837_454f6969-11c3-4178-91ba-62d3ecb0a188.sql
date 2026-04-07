
-- Fix 1: Remove overly permissive storage policies on documents bucket
DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;

-- Fix 2: Remove overly broad anon referral policies
DROP POLICY IF EXISTS "referrals_public_token_select" ON public.referrals;
DROP POLICY IF EXISTS "referrals_public_token_update" ON public.referrals;

-- Fix 3: Drop and recreate marketplace view without PII
DROP VIEW IF EXISTS public.marketplace_cases;

CREATE VIEW public.marketplace_cases
WITH (security_invoker = on)
AS
SELECT
  id,
  case_number,
  specialty,
  accident_state,
  accident_date,
  notes,
  completeness_score,
  status,
  marketplace_submitted_at,
  quality_gate_passed,
  opened_date,
  sol_date,
  lien_amount,
  settlement_estimate,
  preferred_language,
  urgent,
  flag
FROM public.cases
WHERE status = 'Marketplace' AND quality_gate_passed = true;

GRANT SELECT ON public.marketplace_cases TO authenticated;
