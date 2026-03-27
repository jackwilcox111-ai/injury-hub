ALTER TABLE public.insurance_eligibility 
  RENAME COLUMN billing_path TO primary_billing_path;

ALTER TABLE public.insurance_eligibility 
  ADD COLUMN secondary_billing_path text DEFAULT NULL;