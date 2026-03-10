
-- Update profiles role constraint to include new roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','care_manager','attorney','provider','patient','funder'));

-- TABLE: patient_profiles
CREATE TABLE patient_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  date_of_birth date,
  address text,
  city text,
  state text,
  zip text,
  insurance_status text CHECK (insurance_status IN ('None','MedPay','PIP','Health Insurance','Medicare','Medicaid')),
  accident_description text,
  hipaa_auth_signed boolean DEFAULT false,
  hipaa_auth_date timestamptz,
  assignment_of_benefits_signed boolean DEFAULT false,
  aob_date timestamptz,
  preferred_language text DEFAULT 'English',
  created_at timestamptz DEFAULT now()
);

-- TABLE: provider_applications
CREATE TABLE provider_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_name text NOT NULL,
  contact_name text NOT NULL,
  specialty text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  locations integer DEFAULT 1,
  state text NOT NULL,
  license_number text,
  hipaa_baa_agreed boolean DEFAULT false,
  lien_experience boolean DEFAULT false,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- TABLE: attorney_applications
CREATE TABLE attorney_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  state text NOT NULL,
  bar_number text,
  pi_case_volume_monthly integer,
  referral_source text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- TABLE: funder_profiles
CREATE TABLE funder_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  funding_capacity_min numeric(12,2),
  funding_capacity_max numeric(12,2),
  preferred_specialties text[],
  preferred_states text[],
  accredited_investor boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- TABLE: funding_requests
CREATE TABLE funding_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  funder_id uuid REFERENCES funder_profiles(id) ON DELETE SET NULL,
  requested_amount numeric(12,2) NOT NULL,
  approved_amount numeric(12,2),
  advance_date date,
  repayment_amount numeric(12,2),
  repayment_date date,
  status text NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested','Under Review','Approved','Funded','Repaid','Declined')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- TABLE: documents
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  uploader_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (document_type IN (
    'HIPAA Authorization','Assignment of Benefits','Lien Agreement',
    'Letter of Protection','Medical Record','Demand Package',
    'Settlement Agreement','Funding Agreement','Other'
  )),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  signed boolean DEFAULT false,
  signed_at timestamptz,
  visible_to text[] NOT NULL DEFAULT '{admin}',
  created_at timestamptz DEFAULT now()
);

-- TABLE: notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS: patient_profiles
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_profiles_own" ON patient_profiles
  FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "patient_profiles_admin" ON patient_profiles
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','care_manager'));

-- RLS: funder_profiles
ALTER TABLE funder_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funder_profiles_own" ON funder_profiles
  FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "funder_profiles_admin" ON funder_profiles
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- RLS: funding_requests
ALTER TABLE funding_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "funding_requests_admin" ON funding_requests
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "funding_requests_funder_own" ON funding_requests
  FOR SELECT USING (
    funder_id = (SELECT id FROM funder_profiles WHERE profile_id = auth.uid())
  );
CREATE POLICY "funding_requests_attorney_select" ON funding_requests
  FOR SELECT USING (
    case_id IN (
      SELECT id FROM cases WHERE attorney_id = (SELECT firm_id FROM profiles WHERE id = auth.uid())
    )
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'attorney'
  );

-- RLS: documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_admin" ON documents
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','care_manager'));
CREATE POLICY "documents_visible_to_role" ON documents
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = ANY(visible_to)
    OR uploader_id = auth.uid()
  );

-- RLS: notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (recipient_id = auth.uid());

-- RLS: provider_applications (admin only + anonymous insert)
ALTER TABLE provider_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider_apps_admin" ON provider_applications
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "provider_apps_anon_insert" ON provider_applications
  FOR INSERT WITH CHECK (true);

-- RLS: attorney_applications (admin only + anonymous insert)
ALTER TABLE attorney_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attorney_apps_admin" ON attorney_applications
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "attorney_apps_anon_insert" ON attorney_applications
  FOR INSERT WITH CHECK (true);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage RLS: authenticated users can upload/read from documents bucket
CREATE POLICY "documents_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');
CREATE POLICY "documents_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
