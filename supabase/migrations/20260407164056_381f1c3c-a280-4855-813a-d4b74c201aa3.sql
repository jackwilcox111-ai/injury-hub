
-- Create imaging_facilities table
CREATE TABLE public.imaging_facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text NOT NULL,
  city text NOT NULL,
  address text,
  phone text,
  fax text,
  email text,
  accepted_imaging_types text[] NOT NULL DEFAULT '{}',
  is_preferred boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  custom_form_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.imaging_facilities ENABLE ROW LEVEL SECURITY;

-- Only admin can manage imaging facilities
CREATE POLICY "Admin can manage imaging facilities"
  ON public.imaging_facilities FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin')
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Staff and providers can read imaging facilities
CREATE POLICY "Staff and providers can read imaging facilities"
  ON public.imaging_facilities FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('care_manager', 'provider'));

-- Add medical_necessity_md_referral to case_documents document_type options
-- (no constraint change needed, it's a free text field)

-- Trigger for updated_at
CREATE TRIGGER set_imaging_facilities_updated_at
  BEFORE UPDATE ON public.imaging_facilities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
