CREATE POLICY "cases_attorney_update"
ON public.cases
FOR UPDATE
TO authenticated
USING (
  attorney_id = get_user_firm_id(auth.uid())
  AND get_user_role(auth.uid()) = 'attorney'
)
WITH CHECK (
  attorney_id = get_user_firm_id(auth.uid())
  AND get_user_role(auth.uid()) = 'attorney'
);