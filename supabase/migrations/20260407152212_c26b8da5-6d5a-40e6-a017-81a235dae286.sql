
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

  -- Skip if no provider assigned
  IF target_provider_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- For the cases table, the case id is the row id itself
  IF TG_TABLE_NAME = 'cases' THEN
    target_case_id := NEW.id;
  ELSE
    target_case_id := NEW.case_id;
  END IF;

  -- Get provider specialty
  SELECT specialty INTO target_specialty FROM providers WHERE id = target_provider_id;

  -- Insert referral if one doesn't already exist for this provider+case
  INSERT INTO referrals (case_id, provider_id, specialty, referral_method, status, responded_at)
  VALUES (target_case_id, target_provider_id, target_specialty, 'Platform', 'Accepted', NOW())
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RETURN NEW;
END;
$$;
