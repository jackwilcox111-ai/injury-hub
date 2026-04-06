CREATE POLICY "appointments_provider_insert"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (
  (get_user_role(auth.uid()) = 'provider')
  AND (provider_id = get_user_provider_id(auth.uid()))
  AND (case_id IN (SELECT id FROM cases WHERE provider_id = get_user_provider_id(auth.uid())))
);