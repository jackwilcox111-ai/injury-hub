CREATE POLICY "case_tasks_attorney_insert"
ON public.case_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'attorney'
  AND EXISTS (
    SELECT 1 FROM cases c
    WHERE c.id = case_id
      AND c.attorney_id = get_user_firm_id(auth.uid())
  )
);

CREATE POLICY "case_tasks_attorney_select"
ON public.case_tasks
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'attorney'
  AND EXISTS (
    SELECT 1 FROM cases c
    WHERE c.id = case_id
      AND c.attorney_id = get_user_firm_id(auth.uid())
  )
);