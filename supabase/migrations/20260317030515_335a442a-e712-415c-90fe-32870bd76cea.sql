
-- TABLE: demand_letters
CREATE TABLE public.demand_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'Draft',
  content text NOT NULL,
  medical_specials numeric(12,2),
  pain_suffering_demand numeric(12,2),
  total_demand numeric(12,2),
  generated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  finalized_at timestamptz,
  sent_at timestamptz,
  sent_to text,
  colossus_score integer,
  colossus_factors jsonb DEFAULT '[]',
  model_used text DEFAULT 'google/gemini-2.5-flash',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.demand_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demand_admin" ON public.demand_letters
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','care_manager'));

CREATE POLICY "demand_attorney" ON public.demand_letters
  FOR SELECT TO authenticated
  USING (
    status IN ('Finalized','Sent')
    AND case_id IN (SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid()))
    AND get_user_role(auth.uid()) = 'attorney'
  );

-- Validation trigger for demand_letters status
CREATE OR REPLACE FUNCTION public.validate_demand_letter_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('Draft','Reviewed','Finalized','Sent') THEN
    RAISE EXCEPTION 'Invalid demand letter status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_demand_letter_status
BEFORE INSERT OR UPDATE ON public.demand_letters
FOR EACH ROW EXECUTE FUNCTION public.validate_demand_letter_status();

-- TABLE: video_messages
CREATE TABLE public.video_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  recipient_role text NOT NULL,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message_type text NOT NULL,
  script text NOT NULL,
  ai_generated_script boolean DEFAULT true,
  storage_path text,
  thumbnail_path text,
  duration_seconds integer,
  viewed boolean DEFAULT false,
  viewed_at timestamptz,
  sent_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.video_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_admin" ON public.video_messages
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','care_manager'));

CREATE POLICY "video_recipient" ON public.video_messages
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

-- Validation trigger for video_messages
CREATE OR REPLACE FUNCTION public.validate_video_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.recipient_role NOT IN ('patient','attorney','provider') THEN
    RAISE EXCEPTION 'Invalid recipient_role: %', NEW.recipient_role;
  END IF;
  IF NEW.message_type NOT IN ('Welcome','Status Update','Appointment Reminder','Settlement Notification','General') THEN
    RAISE EXCEPTION 'Invalid message_type: %', NEW.message_type;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_video_message
BEFORE INSERT OR UPDATE ON public.video_messages
FOR EACH ROW EXECUTE FUNCTION public.validate_video_message();

-- TABLE: case_timelines
CREATE TABLE public.case_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  event_type text NOT NULL,
  event_title text NOT NULL,
  event_detail text,
  visible_to text[] NOT NULL DEFAULT '{admin,care_manager}',
  auto_generated boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.case_timelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_admin" ON public.case_timelines
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','care_manager'));

CREATE POLICY "timeline_patient" ON public.case_timelines
  FOR SELECT TO authenticated
  USING (
    'patient' = ANY(visible_to)
    AND case_id IN (SELECT case_id FROM patient_profiles WHERE profile_id = auth.uid())
  );

CREATE POLICY "timeline_attorney" ON public.case_timelines
  FOR SELECT TO authenticated
  USING (
    'attorney' = ANY(visible_to)
    AND case_id IN (SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid()))
    AND get_user_role(auth.uid()) = 'attorney'
  );

-- Validation trigger for case_timelines event_type
CREATE OR REPLACE FUNCTION public.validate_timeline_event_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.event_type NOT IN (
    'Intake','Care Manager Assigned','Provider Matched','First Appointment',
    'Appointment Completed','No-Show','Records Requested','Records Received',
    'Records Delivered','Demand Sent','Offer Received','Counter Sent',
    'Settlement Reached','Lien Paid','Case Closed'
  ) THEN
    RAISE EXCEPTION 'Invalid timeline event_type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_timeline_event_type
BEFORE INSERT OR UPDATE ON public.case_timelines
FOR EACH ROW EXECUTE FUNCTION public.validate_timeline_event_type();

-- TABLE: attorney_portal_settings
CREATE TABLE public.attorney_portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attorney_id uuid NOT NULL REFERENCES attorneys(id) ON DELETE CASCADE,
  update_cadence text NOT NULL DEFAULT 'Weekly',
  show_lien_amounts boolean DEFAULT true,
  show_medical_specials boolean DEFAULT true,
  show_demand_letters boolean DEFAULT true,
  show_video_messages boolean DEFAULT true,
  show_case_timeline boolean DEFAULT true,
  show_settlement_worksheet boolean DEFAULT true,
  show_funding_status boolean DEFAULT true,
  show_provider_details boolean DEFAULT true,
  show_policy_limits boolean DEFAULT true,
  show_retainer_status boolean DEFAULT true,
  simplified_mode boolean DEFAULT false,
  custom_welcome_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(attorney_id)
);
ALTER TABLE public.attorney_portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atty_settings_admin" ON public.attorney_portal_settings
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "atty_settings_cm_select" ON public.attorney_portal_settings
  FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'care_manager');

CREATE POLICY "atty_settings_own" ON public.attorney_portal_settings
  FOR SELECT TO authenticated
  USING (
    attorney_id = get_user_firm_id(auth.uid())
    AND get_user_role(auth.uid()) = 'attorney'
  );

-- Validation trigger for attorney_portal_settings cadence
CREATE OR REPLACE FUNCTION public.validate_atty_settings_cadence()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.update_cadence NOT IN ('Daily','Weekly','On Change') THEN
    RAISE EXCEPTION 'Invalid update_cadence: %', NEW.update_cadence;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_atty_settings_cadence
BEFORE INSERT OR UPDATE ON public.attorney_portal_settings
FOR EACH ROW EXECUTE FUNCTION public.validate_atty_settings_cadence();

-- TABLE: insurance_colossus_data
CREATE TABLE public.insurance_colossus_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  injury_severity text,
  treatment_duration_days integer,
  total_medical_specials numeric(12,2),
  specialty_count integer,
  imaging_performed boolean DEFAULT false,
  surgery_performed boolean DEFAULT false,
  pre_existing_conditions boolean DEFAULT false,
  lost_wages_claimed boolean DEFAULT false,
  lost_wages_amount numeric(12,2),
  pain_duration_description text,
  permanent_impairment boolean DEFAULT false,
  impairment_rating_percent integer,
  liability_strength text,
  insurance_carrier text,
  policy_limit numeric(12,2),
  estimated_colossus_range_low numeric(12,2),
  estimated_colossus_range_high numeric(12,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(case_id)
);
ALTER TABLE public.insurance_colossus_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colossus_admin" ON public.insurance_colossus_data
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','care_manager'));

CREATE POLICY "colossus_attorney" ON public.insurance_colossus_data
  FOR SELECT TO authenticated
  USING (
    case_id IN (SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid()))
    AND get_user_role(auth.uid()) = 'attorney'
  );

-- TABLE: policy_details
CREATE TABLE public.policy_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  insurance_carrier text,
  adjuster_name text,
  adjuster_phone text,
  adjuster_email text,
  claim_number text,
  policy_limit_bodily_injury numeric(12,2),
  policy_limit_per_accident numeric(12,2),
  um_uim_limit numeric(12,2),
  medpay_limit numeric(12,2),
  pip_limit numeric(12,2),
  pip_exhausted boolean DEFAULT false,
  retainer_signed boolean DEFAULT false,
  retainer_date date,
  retainer_fee_percent numeric(5,2) DEFAULT 33.33,
  coverage_disputed boolean DEFAULT false,
  coverage_dispute_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(case_id)
);
ALTER TABLE public.policy_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_admin" ON public.policy_details
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','care_manager'));

CREATE POLICY "policy_attorney" ON public.policy_details
  FOR SELECT TO authenticated
  USING (
    case_id IN (SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid()))
    AND get_user_role(auth.uid()) = 'attorney'
  );

-- TABLE: rcm_cases (ar_days computed in application, not generated column)
CREATE TABLE public.rcm_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  date_of_service date NOT NULL,
  cpt_codes text[] NOT NULL DEFAULT '{}',
  icd_codes text[] NOT NULL DEFAULT '{}',
  billed_amount numeric(12,2) NOT NULL,
  insurance_carrier text,
  claim_number text,
  submission_date date,
  submission_status text NOT NULL DEFAULT 'Not Submitted',
  denial_reason text,
  denial_code text,
  appeal_submitted boolean DEFAULT false,
  appeal_date date,
  paid_amount numeric(12,2),
  payment_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rcm_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rcm_admin" ON public.rcm_cases
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin','care_manager'));

CREATE POLICY "rcm_provider_select" ON public.rcm_cases
  FOR SELECT TO authenticated
  USING (provider_id = get_user_provider_id(auth.uid()));

CREATE POLICY "rcm_provider_insert" ON public.rcm_cases
  FOR INSERT TO authenticated
  WITH CHECK (
    provider_id = get_user_provider_id(auth.uid())
    AND get_user_role(auth.uid()) = 'provider'
  );

-- Validation trigger for rcm_cases submission_status
CREATE OR REPLACE FUNCTION public.validate_rcm_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.submission_status NOT IN (
    'Not Submitted','Submitted','Pending','Approved','Denied','Appealed','Paid','Adjusted'
  ) THEN
    RAISE EXCEPTION 'Invalid rcm submission_status: %', NEW.submission_status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_rcm_status
BEFORE INSERT OR UPDATE ON public.rcm_cases
FOR EACH ROW EXECUTE FUNCTION public.validate_rcm_status();

-- Extend funding_requests
ALTER TABLE public.funding_requests
  ADD COLUMN IF NOT EXISTS plaintiff_name text,
  ADD COLUMN IF NOT EXISTS funding_company text,
  ADD COLUMN IF NOT EXISTS funding_type text DEFAULT 'Pre-Settlement',
  ADD COLUMN IF NOT EXISTS interest_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS payoff_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS funding_agreement_signed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS funding_agreement_date date;

-- Validation trigger for funding_type
CREATE OR REPLACE FUNCTION public.validate_funding_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.funding_type IS NOT NULL AND NEW.funding_type NOT IN ('Pre-Settlement','Medical Lien','Post-Settlement') THEN
    RAISE EXCEPTION 'Invalid funding_type: %', NEW.funding_type;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_funding_type
BEFORE INSERT OR UPDATE ON public.funding_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_funding_type();

-- ============ TIMELINE AUTO-GENERATION TRIGGERS ============

-- Case created → Intake timeline event
CREATE OR REPLACE FUNCTION public.auto_timeline_case_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO case_timelines (case_id, event_date, event_type, event_title, visible_to)
  VALUES (NEW.id, CURRENT_DATE, 'Intake', 'Case opened for ' || NEW.patient_name, '{admin,care_manager,patient,attorney}');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_timeline_case_created
AFTER INSERT ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.auto_timeline_case_created();

-- Appointment status changes
CREATE OR REPLACE FUNCTION public.auto_timeline_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed') THEN
    INSERT INTO case_timelines (case_id, event_date, event_type, event_title, visible_to)
    VALUES (NEW.case_id, CURRENT_DATE, 'Appointment Completed',
      'Appointment completed' || COALESCE(' — ' || NEW.specialty, ''),
      '{admin,care_manager,patient,attorney}');
  ELSIF NEW.status = 'No-Show' AND (OLD.status IS DISTINCT FROM 'No-Show') THEN
    INSERT INTO case_timelines (case_id, event_date, event_type, event_title, visible_to)
    VALUES (NEW.case_id, CURRENT_DATE, 'No-Show', 'Missed appointment', '{admin,care_manager}');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_timeline_appointment
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.auto_timeline_appointment();

-- Records insert/update
CREATE OR REPLACE FUNCTION public.auto_timeline_records()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO case_timelines (case_id, event_date, event_type, event_title, visible_to)
    VALUES (NEW.case_id, CURRENT_DATE, 'Records Requested',
      'Medical records requested' || COALESCE(' from ' || (SELECT name FROM providers WHERE id = NEW.provider_id), ''),
      '{admin,care_manager}');
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.received_date IS NOT NULL AND OLD.received_date IS NULL THEN
      INSERT INTO case_timelines (case_id, event_date, event_type, event_title, visible_to)
      VALUES (NEW.case_id, NEW.received_date, 'Records Received', 'Medical records received', '{admin,care_manager,attorney}');
    END IF;
    IF NEW.delivered_to_attorney_date IS NOT NULL AND OLD.delivered_to_attorney_date IS NULL THEN
      INSERT INTO case_timelines (case_id, event_date, event_type, event_title, visible_to)
      VALUES (NEW.case_id, NEW.delivered_to_attorney_date, 'Records Delivered', 'Records delivered to attorney', '{admin,care_manager,attorney}');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_timeline_records_insert
AFTER INSERT ON public.records
FOR EACH ROW EXECUTE FUNCTION public.auto_timeline_records();
CREATE TRIGGER trg_timeline_records_update
AFTER UPDATE ON public.records
FOR EACH ROW EXECUTE FUNCTION public.auto_timeline_records();

-- Case status changes (settlement)
CREATE OR REPLACE FUNCTION public.auto_timeline_case_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'Settled' AND OLD.status IS DISTINCT FROM 'Settled' THEN
    INSERT INTO case_timelines (case_id, event_date, event_type, event_title, visible_to)
    VALUES (NEW.id, CURRENT_DATE, 'Settlement Reached', 'Case settled', '{admin,care_manager,patient,attorney}');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_timeline_case_status
AFTER UPDATE ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.auto_timeline_case_status();

-- Lien paid
CREATE OR REPLACE FUNCTION public.auto_timeline_lien_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'Paid' AND OLD.status IS DISTINCT FROM 'Paid' THEN
    INSERT INTO case_timelines (case_id, event_date, event_type, event_title, visible_to)
    VALUES (NEW.case_id, CURRENT_DATE, 'Lien Paid', 'Lien paid to provider', '{admin,care_manager,attorney}');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_timeline_lien_paid
AFTER UPDATE ON public.liens
FOR EACH ROW EXECUTE FUNCTION public.auto_timeline_lien_paid();

-- Demand letter sent
CREATE OR REPLACE FUNCTION public.auto_timeline_demand_sent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sent_at IS NOT NULL AND OLD.sent_at IS NULL THEN
    INSERT INTO case_timelines (case_id, event_date, event_type, event_title, visible_to)
    VALUES (NEW.case_id, CURRENT_DATE, 'Demand Sent', 'Demand letter sent to insurance', '{admin,care_manager,attorney}');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_timeline_demand_sent
AFTER UPDATE ON public.demand_letters
FOR EACH ROW EXECUTE FUNCTION public.auto_timeline_demand_sent();

-- Create messages storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('messages', 'messages', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for messages bucket
CREATE POLICY "messages_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'messages' AND get_user_role(auth.uid()) IN ('admin','care_manager'))
  WITH CHECK (bucket_id = 'messages' AND get_user_role(auth.uid()) IN ('admin','care_manager'));

CREATE POLICY "messages_recipient_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'messages');
