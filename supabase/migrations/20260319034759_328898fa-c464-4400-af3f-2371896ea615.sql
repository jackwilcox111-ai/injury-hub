-- Create a marketplace view that strips patient PII for attorneys browsing
CREATE OR REPLACE VIEW public.marketplace_cases
WITH (security_invoker = on) AS
SELECT
  c.id,
  c.case_number,
  c.specialty,
  c.accident_state,
  c.accident_date,
  c.sol_date,
  c.lien_amount,
  c.status,
  c.completeness_score,
  c.quality_gate_passed,
  c.marketplace_submitted_at,
  c.created_at
FROM cases c
WHERE c.status = 'Marketplace' AND c.quality_gate_passed = true;