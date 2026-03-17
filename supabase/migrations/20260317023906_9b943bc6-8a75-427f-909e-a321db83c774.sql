
-- Recreate cases_with_counts as a security_invoker view so RLS applies
DROP VIEW IF EXISTS public.cases_with_counts;

CREATE VIEW public.cases_with_counts
WITH (security_invoker = on)
AS
SELECT
  c.*,
  (SELECT count(*) FROM appointments a WHERE a.case_id = c.id) AS appointments_total,
  (SELECT count(*) FROM appointments a WHERE a.case_id = c.id AND a.status = 'Completed') AS appointments_completed
FROM cases c;

-- Add no-show notification trigger
CREATE OR REPLACE FUNCTION public.notify_noshow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'No-Show' AND (OLD.status IS DISTINCT FROM 'No-Show') THEN
    INSERT INTO notifications (recipient_id, title, message, link)
    SELECT p.id,
      'No-Show Alert',
      'Patient missed appointment for case ' || (SELECT case_number FROM cases WHERE id = NEW.case_id),
      '/cases/' || NEW.case_id
    FROM profiles p WHERE p.role IN ('admin', 'care_manager');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_noshow
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_noshow();

-- Add storage policies for document uploads
CREATE POLICY "Admin/CM can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND (
    get_user_role(auth.uid()) IN ('admin', 'care_manager')
  ));

CREATE POLICY "Admin/CM can read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND (
    get_user_role(auth.uid()) IN ('admin', 'care_manager', 'attorney', 'provider')
  ));

CREATE POLICY "Admin/CM can delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND (
    get_user_role(auth.uid()) IN ('admin', 'care_manager')
  ));
