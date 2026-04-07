
-- Allow patients to SELECT their own case
CREATE POLICY "cases_patient_select"
ON public.cases
FOR SELECT
TO authenticated
USING (
  (get_user_role(auth.uid()) = 'patient') 
  AND id IN (
    SELECT case_id FROM patient_profiles WHERE profile_id = auth.uid()
  )
);

-- Allow patients to SELECT providers assigned to their case
CREATE POLICY "providers_patient_select"
ON public.providers
FOR SELECT
TO authenticated
USING (
  (get_user_role(auth.uid()) = 'patient')
  AND id IN (
    SELECT provider_id FROM cases WHERE id IN (
      SELECT case_id FROM patient_profiles WHERE profile_id = auth.uid()
    )
    UNION
    SELECT provider_id FROM appointments WHERE case_id IN (
      SELECT case_id FROM patient_profiles WHERE profile_id = auth.uid()
    ) AND provider_id IS NOT NULL
  )
);

-- Allow patients to SELECT provider_locations for their providers
CREATE POLICY "provider_locations_patient_select"
ON public.provider_locations
FOR SELECT
TO authenticated
USING (
  (get_user_role(auth.uid()) = 'patient')
  AND provider_id IN (
    SELECT provider_id FROM cases WHERE id IN (
      SELECT case_id FROM patient_profiles WHERE profile_id = auth.uid()
    )
    UNION
    SELECT provider_id FROM appointments WHERE case_id IN (
      SELECT case_id FROM patient_profiles WHERE profile_id = auth.uid()
    ) AND provider_id IS NOT NULL
  )
);
