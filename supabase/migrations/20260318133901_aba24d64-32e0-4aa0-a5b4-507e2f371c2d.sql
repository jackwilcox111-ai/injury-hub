
-- Function: when a charge with billing_path='Lien' is inserted/updated,
-- upsert a lien record for that provider+case combination.
-- The lien amount = sum of all Lien-path charges for that provider on that case.
CREATE OR REPLACE FUNCTION public.sync_lien_from_charges()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  target_case_id uuid;
  target_provider_id uuid;
  total_charges numeric;
  existing_lien_id uuid;
BEGIN
  target_case_id := COALESCE(NEW.case_id, OLD.case_id);
  target_provider_id := COALESCE(NEW.provider_id, OLD.provider_id);

  -- Only act on Lien-path charges that have a provider
  IF target_provider_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Sum all Lien-path charges for this provider+case
  SELECT COALESCE(SUM(charge_amount), 0)
  INTO total_charges
  FROM charges
  WHERE case_id = target_case_id
    AND provider_id = target_provider_id
    AND billing_path = 'Lien';

  -- Find existing lien for this provider+case
  SELECT id INTO existing_lien_id
  FROM liens
  WHERE case_id = target_case_id
    AND provider_id = target_provider_id
  LIMIT 1;

  IF total_charges > 0 THEN
    IF existing_lien_id IS NOT NULL THEN
      -- Update existing lien amount
      UPDATE liens SET amount = total_charges WHERE id = existing_lien_id;
    ELSE
      -- Create new lien
      INSERT INTO liens (case_id, provider_id, amount, status)
      VALUES (target_case_id, target_provider_id, total_charges, 'Active');
    END IF;
  ELSIF existing_lien_id IS NOT NULL AND total_charges = 0 THEN
    -- No more lien charges, remove the auto-created lien
    DELETE FROM liens WHERE id = existing_lien_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on charges table for insert, update, delete
CREATE TRIGGER trg_sync_lien_from_charges
  AFTER INSERT OR UPDATE OR DELETE ON public.charges
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_lien_from_charges();
