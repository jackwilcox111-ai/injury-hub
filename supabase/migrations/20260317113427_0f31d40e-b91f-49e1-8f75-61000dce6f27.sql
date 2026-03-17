
-- Auto-create default attorney_portal_settings when a new attorney is inserted
CREATE OR REPLACE FUNCTION public.auto_create_attorney_portal_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO attorney_portal_settings (attorney_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_attorney_portal_settings
AFTER INSERT ON public.attorneys
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_attorney_portal_settings();
