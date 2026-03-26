CREATE POLICY "case_updates_attorney_insert"
ON public.case_updates
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'attorney'
  AND case_id IN (
    SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid())
  )
  AND author_id = auth.uid()
);