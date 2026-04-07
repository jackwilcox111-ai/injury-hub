
CREATE OR REPLACE FUNCTION public.auto_create_referral_on_provider_assign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_case_id uuid;
  target_provider_id uuid;
  target_specialty text;
BEGIN
  target_provider_id := NEW.provider_id;

  IF target_provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'cases' THEN
    target_case_id := NEW.id;
  ELSE
    target_case_id := NEW.case_id;
  END IF;

  SELECT specialty INTO target_specialty FROM providers WHERE id = target_provider_id;

  INSERT INTO referrals (case_id, provider_id, specialty, referral_method, status)
  VALUES (target_case_id, target_provider_id, target_specialty, 'Platform', 'Sent')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RETURN NEW;
END;
$$;
