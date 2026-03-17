
-- Create funder_applications table for tracking funder interest submissions
CREATE TABLE public.funder_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  funding_capacity_min NUMERIC,
  funding_capacity_max NUMERIC,
  accredited_investor BOOLEAN DEFAULT false,
  experience_notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.funder_applications ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "funder_apps_admin" ON public.funder_applications
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- Public insert for join form
CREATE POLICY "funder_apps_anon_insert" ON public.funder_applications
  FOR INSERT TO public
  WITH CHECK (true);
