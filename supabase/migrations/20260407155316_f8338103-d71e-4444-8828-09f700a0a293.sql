
CREATE OR REPLACE FUNCTION public.auto_set_message_recipient()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  resolved_id uuid;
BEGIN
  -- If recipient_id is already set, skip
  IF NEW.recipient_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if no case linked
  IF NEW.case_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.recipient_role = 'patient' THEN
    SELECT pp.profile_id INTO resolved_id
    FROM patient_profiles pp
    WHERE pp.case_id = NEW.case_id
    LIMIT 1;
  ELSIF NEW.recipient_role = 'attorney' THEN
    SELECT p.id INTO resolved_id
    FROM cases c
    JOIN profiles p ON p.firm_id = c.attorney_id
    WHERE c.id = NEW.case_id
    LIMIT 1;
  ELSIF NEW.recipient_role = 'care_manager' THEN
    -- Route to any care_manager; could be refined later
    SELECT p.id INTO resolved_id
    FROM profiles p
    WHERE p.role = 'care_manager'
    LIMIT 1;
  END IF;

  NEW.recipient_id := resolved_id;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_set_message_recipient
  BEFORE INSERT ON public.video_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_message_recipient();

-- Backfill existing messages with null recipient_id
UPDATE video_messages vm
SET recipient_id = pp.profile_id
FROM patient_profiles pp
WHERE vm.recipient_role = 'patient'
  AND vm.case_id = pp.case_id
  AND vm.recipient_id IS NULL;

UPDATE video_messages vm
SET recipient_id = p.id
FROM cases c
JOIN profiles p ON p.firm_id = c.attorney_id
WHERE vm.recipient_role = 'attorney'
  AND vm.case_id = c.id
  AND vm.recipient_id IS NULL;
