
-- Function to auto-create referral record when a provider is assigned to a case
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
  target_case_id := NEW.case_id;
  target_provider_id := NEW.provider_id;

  -- For the cases table, the column is 'id' not 'case_id'
  IF TG_TABLE_NAME = 'cases' THEN
    target_case_id := NEW.id;
  END IF;

  -- Skip if no provider assigned
  IF target_provider_id IS NULL THEN
    RETURN NEW;
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

-- Trigger on cases table (primary provider assignment)
CREATE TRIGGER trg_referral_on_case_provider
  AFTER INSERT OR UPDATE OF provider_id ON public.cases
  FOR EACH ROW
  WHEN (NEW.provider_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_create_referral_on_provider_assign();

-- Trigger on appointments
CREATE TRIGGER trg_referral_on_appointment_provider
  AFTER INSERT OR UPDATE OF provider_id ON public.appointments
  FOR EACH ROW
  WHEN (NEW.provider_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_create_referral_on_provider_assign();

-- Trigger on charges
CREATE TRIGGER trg_referral_on_charge_provider
  AFTER INSERT OR UPDATE OF provider_id ON public.charges
  FOR EACH ROW
  WHEN (NEW.provider_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_create_referral_on_provider_assign();

-- Trigger on liens
CREATE TRIGGER trg_referral_on_lien_provider
  AFTER INSERT OR UPDATE OF provider_id ON public.liens
  FOR EACH ROW
  WHEN (NEW.provider_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_create_referral_on_provider_assign();

-- Trigger on records
CREATE TRIGGER trg_referral_on_record_provider
  AFTER INSERT OR UPDATE OF provider_id ON public.records
  FOR EACH ROW
  WHEN (NEW.provider_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_create_referral_on_provider_assign();
