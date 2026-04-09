
CREATE OR REPLACE FUNCTION public.notify_unsigned_lien()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_case_number text;
  v_provider_name text;
BEGIN
  -- Only alert if lien is active/reduced and has no signed document
  IF NEW.status NOT IN ('Active', 'Reduced') THEN
    RETURN NEW;
  END IF;

  IF NEW.lien_document_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only fire if lien_document_id didn't change (avoid noise)
  IF TG_OP = 'UPDATE' AND OLD.lien_document_id IS NOT DISTINCT FROM NEW.lien_document_id 
     AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT case_number INTO v_case_number FROM cases WHERE id = NEW.case_id;
  SELECT name INTO v_provider_name FROM providers WHERE id = NEW.provider_id;

  INSERT INTO notifications (recipient_id, title, message, link)
  SELECT p.id,
    'Unsigned Lien Alert',
    'Lien for ' || COALESCE(v_provider_name, 'unknown provider') || ' on case ' || COALESCE(v_case_number, '—') || ' is missing a signed agreement.',
    '/liens'
  FROM profiles p
  WHERE p.role IN ('admin', 'care_manager');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_unsigned_lien
AFTER INSERT OR UPDATE ON public.liens
FOR EACH ROW
EXECUTE FUNCTION public.notify_unsigned_lien();
