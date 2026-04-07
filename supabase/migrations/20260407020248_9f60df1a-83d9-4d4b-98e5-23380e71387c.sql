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

  IF target_provider_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Sum Lien-path charges excluding Denied status
  SELECT COALESCE(SUM(charge_amount), 0)
  INTO total_charges
  FROM charges
  WHERE case_id = target_case_id
    AND provider_id = target_provider_id
    AND billing_path = 'Lien'
    AND status NOT IN ('Denied');

  SELECT id INTO existing_lien_id
  FROM liens
  WHERE case_id = target_case_id
    AND provider_id = target_provider_id
  LIMIT 1;

  IF total_charges > 0 THEN
    IF existing_lien_id IS NOT NULL THEN
      UPDATE liens SET amount = total_charges WHERE id = existing_lien_id;
    ELSE
      INSERT INTO liens (case_id, provider_id, amount, status)
      VALUES (target_case_id, target_provider_id, total_charges, 'Active');
    END IF;
  ELSIF existing_lien_id IS NOT NULL AND total_charges = 0 THEN
    DELETE FROM liens WHERE id = existing_lien_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;