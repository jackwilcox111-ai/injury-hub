
-- Providers: can create and view documents on their assigned cases
CREATE POLICY "Providers can manage their case documents"
  ON public.case_documents
  FOR ALL
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'provider'
    AND case_id IN (
      SELECT c.id FROM cases c
      WHERE c.provider_id = public.get_user_provider_id(auth.uid())
    )
  )
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'provider'
    AND case_id IN (
      SELECT c.id FROM cases c
      WHERE c.provider_id = public.get_user_provider_id(auth.uid())
    )
  );
