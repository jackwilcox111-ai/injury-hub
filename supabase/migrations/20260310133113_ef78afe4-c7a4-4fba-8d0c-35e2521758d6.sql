
-- Create a security definer function to check user role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Create helper to get firm_id
CREATE OR REPLACE FUNCTION public.get_user_firm_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Create helper to get provider_id
CREATE OR REPLACE FUNCTION public.get_user_provider_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT provider_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Fix profiles table policies (the source of the recursion)
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;

CREATE POLICY "profiles_admin_all" ON public.profiles
FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "profiles_self_select" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- Fix all other tables that reference profiles in their policies
-- appointments
DROP POLICY IF EXISTS "appointments_admin_all" ON public.appointments;
DROP POLICY IF EXISTS "appointments_attorney_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_care_manager_all" ON public.appointments;
DROP POLICY IF EXISTS "appointments_provider_select" ON public.appointments;

CREATE POLICY "appointments_admin_all" ON public.appointments FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "appointments_care_manager_all" ON public.appointments FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'care_manager');
CREATE POLICY "appointments_attorney_select" ON public.appointments FOR SELECT TO authenticated
USING (case_id IN (SELECT id FROM cases WHERE attorney_id = public.get_user_firm_id(auth.uid())));
CREATE POLICY "appointments_provider_select" ON public.appointments FOR SELECT TO authenticated
USING (provider_id = public.get_user_provider_id(auth.uid()));

-- attorney_applications
DROP POLICY IF EXISTS "attorney_apps_admin" ON public.attorney_applications;
CREATE POLICY "attorney_apps_admin" ON public.attorney_applications FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

-- attorneys
DROP POLICY IF EXISTS "attorneys_admin_all" ON public.attorneys;
DROP POLICY IF EXISTS "attorneys_attorney_select" ON public.attorneys;
DROP POLICY IF EXISTS "attorneys_care_manager_select" ON public.attorneys;

CREATE POLICY "attorneys_admin_all" ON public.attorneys FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "attorneys_attorney_select" ON public.attorneys FOR SELECT TO authenticated
USING (public.get_user_role(auth.uid()) = 'attorney');
CREATE POLICY "attorneys_care_manager_select" ON public.attorneys FOR SELECT TO authenticated
USING (public.get_user_role(auth.uid()) = 'care_manager');

-- case_sequence
DROP POLICY IF EXISTS "case_sequence_admin_all" ON public.case_sequence;
CREATE POLICY "case_sequence_admin_all" ON public.case_sequence FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

-- case_updates
DROP POLICY IF EXISTS "case_updates_admin_all" ON public.case_updates;
DROP POLICY IF EXISTS "case_updates_attorney_select" ON public.case_updates;
DROP POLICY IF EXISTS "case_updates_care_manager_all" ON public.case_updates;

CREATE POLICY "case_updates_admin_all" ON public.case_updates FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "case_updates_care_manager_all" ON public.case_updates FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'care_manager');
CREATE POLICY "case_updates_attorney_select" ON public.case_updates FOR SELECT TO authenticated
USING (case_id IN (SELECT id FROM cases WHERE attorney_id = public.get_user_firm_id(auth.uid())));

-- cases
DROP POLICY IF EXISTS "cases_admin_all" ON public.cases;
DROP POLICY IF EXISTS "cases_attorney_select" ON public.cases;
DROP POLICY IF EXISTS "cases_care_manager_all" ON public.cases;
DROP POLICY IF EXISTS "cases_provider_select" ON public.cases;

CREATE POLICY "cases_admin_all" ON public.cases FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "cases_care_manager_all" ON public.cases FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'care_manager');
CREATE POLICY "cases_attorney_select" ON public.cases FOR SELECT TO authenticated
USING (attorney_id = public.get_user_firm_id(auth.uid()) AND public.get_user_role(auth.uid()) = 'attorney');
CREATE POLICY "cases_provider_select" ON public.cases FOR SELECT TO authenticated
USING (provider_id = public.get_user_provider_id(auth.uid()) AND public.get_user_role(auth.uid()) = 'provider');

-- documents
DROP POLICY IF EXISTS "documents_admin" ON public.documents;
DROP POLICY IF EXISTS "documents_visible_to_role" ON public.documents;

CREATE POLICY "documents_admin" ON public.documents FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) IN ('admin', 'care_manager'));
CREATE POLICY "documents_visible_to_role" ON public.documents FOR SELECT TO authenticated
USING (public.get_user_role(auth.uid()) = ANY(visible_to) OR uploader_id = auth.uid());

-- funder_profiles
DROP POLICY IF EXISTS "funder_profiles_admin" ON public.funder_profiles;
CREATE POLICY "funder_profiles_admin" ON public.funder_profiles FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

-- funding_requests
DROP POLICY IF EXISTS "funding_requests_admin" ON public.funding_requests;
DROP POLICY IF EXISTS "funding_requests_attorney_select" ON public.funding_requests;

CREATE POLICY "funding_requests_admin" ON public.funding_requests FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "funding_requests_attorney_select" ON public.funding_requests FOR SELECT TO authenticated
USING (case_id IN (SELECT id FROM cases WHERE attorney_id = public.get_user_firm_id(auth.uid())) AND public.get_user_role(auth.uid()) = 'attorney');

-- liens
DROP POLICY IF EXISTS "liens_admin_all" ON public.liens;
CREATE POLICY "liens_admin_all" ON public.liens FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');

-- patient_profiles
DROP POLICY IF EXISTS "patient_profiles_admin" ON public.patient_profiles;
CREATE POLICY "patient_profiles_admin" ON public.patient_profiles FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) IN ('admin', 'care_manager'));

-- providers
DROP POLICY IF EXISTS "providers_admin_all" ON public.providers;
DROP POLICY IF EXISTS "providers_care_manager_select" ON public.providers;
DROP POLICY IF EXISTS "providers_provider_self_select" ON public.providers;

CREATE POLICY "providers_admin_all" ON public.providers FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "providers_care_manager_select" ON public.providers FOR SELECT TO authenticated
USING (public.get_user_role(auth.uid()) = 'care_manager');
CREATE POLICY "providers_provider_self_select" ON public.providers FOR SELECT TO authenticated
USING (id = public.get_user_provider_id(auth.uid()));

-- records
DROP POLICY IF EXISTS "records_admin_all" ON public.records;
DROP POLICY IF EXISTS "records_care_manager_all" ON public.records;

CREATE POLICY "records_admin_all" ON public.records FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "records_care_manager_all" ON public.records FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'care_manager');

-- provider_applications
DROP POLICY IF EXISTS "provider_apps_admin" ON public.provider_applications;
CREATE POLICY "provider_apps_admin" ON public.provider_applications FOR ALL TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin');
