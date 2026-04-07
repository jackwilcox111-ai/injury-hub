CREATE POLICY "providers_public_map_select_authenticated"
ON public.providers
FOR SELECT
TO authenticated
USING (status = 'Active' AND listed_on_map = true);