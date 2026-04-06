CREATE TABLE public.provider_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  label text DEFAULT 'Main Office',
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  phone text,
  fax text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.provider_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY provider_locations_admin_all ON public.provider_locations
  FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'care_manager'));

CREATE POLICY provider_locations_provider_select ON public.provider_locations
  FOR SELECT TO authenticated
  USING (provider_id = get_user_provider_id(auth.uid()) AND get_user_role(auth.uid()) = 'provider');

CREATE POLICY provider_locations_attorney_select ON public.provider_locations
  FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'attorney');