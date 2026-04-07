CREATE OR REPLACE FUNCTION public.validate_video_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.recipient_role NOT IN ('patient','attorney','provider','care_manager') THEN
    RAISE EXCEPTION 'Invalid recipient_role: %', NEW.recipient_role;
  END IF;
  IF NEW.message_type NOT IN ('Welcome','Status Update','Appointment Reminder','Settlement Notification','General') THEN
    RAISE EXCEPTION 'Invalid message_type: %', NEW.message_type;
  END IF;
  RETURN NEW;
END;
$function$;