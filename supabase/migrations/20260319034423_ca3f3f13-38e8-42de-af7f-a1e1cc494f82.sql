-- 1. Fix cases_with_counts view: recreate with security_invoker = on
DROP VIEW IF EXISTS public.cases_with_counts;

CREATE VIEW public.cases_with_counts
WITH (security_invoker = on) AS
SELECT
  c.id,
  c.case_number,
  c.patient_name,
  c.patient_phone,
  c.patient_email,
  c.status,
  c.flag,
  c.specialty,
  c.accident_date,
  c.accident_state,
  c.opened_date,
  c.sol_period_days,
  c.sol_date,
  c.lien_amount,
  c.settlement_estimate,
  c.settlement_final,
  c.attorney_id,
  c.provider_id,
  c.notes,
  c.created_at,
  c.updated_at,
  COUNT(a.id) AS appointments_total,
  COUNT(a.id) FILTER (WHERE a.status = 'Completed') AS appointments_completed
FROM cases c
LEFT JOIN appointments a ON a.case_id = c.id
GROUP BY c.id;

-- 2. Fix attorney-scoped policies missing role check
-- appointments_attorney_select
DROP POLICY IF EXISTS "appointments_attorney_select" ON public.appointments;
CREATE POLICY "appointments_attorney_select" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    case_id IN (SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid()))
    AND get_user_role(auth.uid()) = 'attorney'
  );

-- ins_elig_attorney_select
DROP POLICY IF EXISTS "ins_elig_attorney_select" ON public.insurance_eligibility;
CREATE POLICY "ins_elig_attorney_select" ON public.insurance_eligibility
  FOR SELECT TO authenticated
  USING (
    case_id IN (SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid()))
    AND get_user_role(auth.uid()) = 'attorney'
  );

-- ai_summaries_attorney_select
DROP POLICY IF EXISTS "ai_summaries_attorney_select" ON public.ai_summaries;
CREATE POLICY "ai_summaries_attorney_select" ON public.ai_summaries
  FOR SELECT TO authenticated
  USING (
    case_id IN (SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid()))
    AND get_user_role(auth.uid()) = 'attorney'
  );

-- case_updates_attorney_select
DROP POLICY IF EXISTS "case_updates_attorney_select" ON public.case_updates;
CREATE POLICY "case_updates_attorney_select" ON public.case_updates
  FOR SELECT TO authenticated
  USING (
    case_id IN (SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid()))
    AND get_user_role(auth.uid()) = 'attorney'
  );

-- 3. Fix provider-scoped policies missing role check
-- charges_provider_select
DROP POLICY IF EXISTS "charges_provider_select" ON public.charges;
CREATE POLICY "charges_provider_select" ON public.charges
  FOR SELECT TO authenticated
  USING (
    provider_id = get_user_provider_id(auth.uid())
    AND get_user_role(auth.uid()) = 'provider'
  );

-- rcm_provider_select
DROP POLICY IF EXISTS "rcm_provider_select" ON public.rcm_cases;
CREATE POLICY "rcm_provider_select" ON public.rcm_cases
  FOR SELECT TO authenticated
  USING (
    provider_id = get_user_provider_id(auth.uid())
    AND get_user_role(auth.uid()) = 'provider'
  );