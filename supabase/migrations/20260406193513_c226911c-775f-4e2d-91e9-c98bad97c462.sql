CREATE POLICY "charges_provider_update"
ON public.charges FOR UPDATE
TO authenticated
USING (
  (provider_id = get_user_provider_id(auth.uid()))
  AND (get_user_role(auth.uid()) = 'provider')
  AND (status = 'Pending')
)
WITH CHECK (
  (provider_id = get_user_provider_id(auth.uid()))
  AND (get_user_role(auth.uid()) = 'provider')
);