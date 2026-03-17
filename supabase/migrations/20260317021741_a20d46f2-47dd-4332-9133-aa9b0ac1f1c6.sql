
-- =========================================
-- Module 1: Insurance Eligibility
-- =========================================
CREATE TABLE public.insurance_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  insurance_type text NOT NULL DEFAULT 'None', -- None, PIP, MedPay, Health Insurance, Medicare, Medicaid
  billing_path text NOT NULL DEFAULT 'Lien Only', -- Lien Only, PIP Primary, MedPay Primary, Dual Path
  policy_number text,
  carrier_name text,
  coverage_limit numeric(12,2),
  amount_used numeric(12,2) DEFAULT 0,
  verified boolean DEFAULT false,
  verified_by uuid REFERENCES public.profiles(id),
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.insurance_eligibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ins_elig_admin_all" ON public.insurance_eligibility FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ins_elig_cm_all" ON public.insurance_eligibility FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'care_manager');
CREATE POLICY "ins_elig_attorney_select" ON public.insurance_eligibility FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid())));

-- =========================================
-- Module 2: Charges / Billing
-- =========================================
CREATE TABLE public.charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.providers(id),
  service_date date NOT NULL,
  cpt_code text NOT NULL,
  cpt_description text,
  units integer DEFAULT 1,
  charge_amount numeric(12,2) NOT NULL DEFAULT 0,
  allowed_amount numeric(12,2),
  paid_amount numeric(12,2) DEFAULT 0,
  billing_path text DEFAULT 'Lien', -- Lien, PIP, MedPay, Insurance
  status text NOT NULL DEFAULT 'Pending', -- Pending, Submitted, Paid, Denied, Adjusted
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "charges_admin_all" ON public.charges FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "charges_cm_all" ON public.charges FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'care_manager');
CREATE POLICY "charges_provider_select" ON public.charges FOR SELECT TO authenticated
  USING (provider_id = get_user_provider_id(auth.uid()));

-- =========================================
-- Module 4: SoL Alerts
-- =========================================
CREATE TABLE public.sol_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  alert_tier integer NOT NULL, -- 365, 180, 90, 30
  sent_at timestamptz DEFAULT now(),
  recipient_email text,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES public.profiles(id),
  acknowledged_at timestamptz
);

ALTER TABLE public.sol_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sol_alerts_admin_all" ON public.sol_alerts FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "sol_alerts_cm_select" ON public.sol_alerts FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'care_manager');

-- =========================================
-- Module 5: AI Summaries
-- =========================================
CREATE TABLE public.ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  summary_type text NOT NULL, -- 'medical_chronology', 'demand_readiness'
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  readiness_score integer, -- 0-100 for demand readiness
  generated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_summaries_admin_all" ON public.ai_summaries FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "ai_summaries_cm_all" ON public.ai_summaries FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'care_manager');
CREATE POLICY "ai_summaries_attorney_select" ON public.ai_summaries FOR SELECT TO authenticated
  USING (case_id IN (SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid())));

-- =========================================
-- Module 6: WorkPlans
-- =========================================
CREATE TABLE public.workplan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_status text NOT NULL, -- which case status triggers this plan
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of {title, description, due_days_offset, assignee_role}
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.workplan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workplan_tpl_admin_all" ON public.workplan_templates FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "workplan_tpl_cm_select" ON public.workplan_templates FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'care_manager');

CREATE TABLE public.case_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Pending', -- Pending, In Progress, Completed, Skipped
  assignee_id uuid REFERENCES public.profiles(id),
  due_date date,
  completed_at timestamptz,
  workplan_template_id uuid REFERENCES public.workplan_templates(id),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.case_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_tasks_admin_all" ON public.case_tasks FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "case_tasks_cm_all" ON public.case_tasks FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'care_manager');
CREATE POLICY "case_tasks_assignee_select" ON public.case_tasks FOR SELECT TO authenticated
  USING (assignee_id = auth.uid());
CREATE POLICY "case_tasks_assignee_update" ON public.case_tasks FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid());

-- =========================================
-- Module 7: Patient Check-ins
-- =========================================
CREATE TABLE public.patient_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.profiles(id),
  pain_level integer CHECK (pain_level >= 1 AND pain_level <= 10),
  mood text, -- 'good', 'fair', 'poor'
  notes text,
  logged_by text DEFAULT 'patient', -- 'patient', 'care_manager', 'system'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.patient_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins_admin_all" ON public.patient_checkins FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "checkins_cm_all" ON public.patient_checkins FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'care_manager');
CREATE POLICY "checkins_patient_own" ON public.patient_checkins FOR ALL TO authenticated
  USING (patient_id = auth.uid());

-- =========================================
-- Module 8: Referral Sources
-- =========================================
CREATE TABLE public.referral_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'case', 'attorney_application', 'provider_application', 'patient_intake'
  entity_id uuid NOT NULL,
  source_type text NOT NULL, -- 'Attorney Referral', 'Google', 'Social Media', 'Word of Mouth', 'Website', 'Other'
  source_detail text, -- e.g., attorney name or campaign name
  referring_attorney_id uuid REFERENCES public.attorneys(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.referral_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_admin_all" ON public.referral_sources FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "referrals_anon_insert" ON public.referral_sources FOR INSERT TO public
  WITH CHECK (true);

-- =========================================
-- Triggers for updated_at
-- =========================================
CREATE TRIGGER set_insurance_eligibility_updated_at
  BEFORE UPDATE ON public.insurance_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_ai_summaries_updated_at
  BEFORE UPDATE ON public.ai_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
