CREATE POLICY "case_tasks_provider_insert"
ON public.case_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'provider'
  AND EXISTS (
    SELECT 1 FROM cases c
    WHERE c.id = case_tasks.case_id
    AND c.provider_id = get_user_provider_id(auth.uid())
  )
);

CREATE POLICY "case_tasks_provider_select"
ON public.case_tasks
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'provider'
  AND EXISTS (
    SELECT 1 FROM cases c
    WHERE c.id = case_tasks.case_id
    AND c.provider_id = get_user_provider_id(auth.uid())
  )
);