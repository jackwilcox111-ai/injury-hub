-- Allow providers to update their own provider record
CREATE POLICY "providers_provider_self_update"
ON public.providers
FOR UPDATE
TO authenticated
USING (id = get_user_provider_id(auth.uid()) AND get_user_role(auth.uid()) = 'provider'::text)
WITH CHECK (id = get_user_provider_id(auth.uid()) AND get_user_role(auth.uid()) = 'provider'::text);