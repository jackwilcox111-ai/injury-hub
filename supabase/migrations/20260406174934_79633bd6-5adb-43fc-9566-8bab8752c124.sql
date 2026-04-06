
-- Allow attorneys to upload documents for their firm's cases
CREATE POLICY "documents_attorney_insert"
ON public.documents
FOR INSERT TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'attorney'
  AND uploader_id = auth.uid()
  AND (
    case_id IS NULL
    OR EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
        AND c.attorney_id = get_user_firm_id(auth.uid())
    )
  )
);

-- Allow attorneys to update flag on their firm's cases (for Open/Closed/Dropped)
CREATE POLICY "cases_attorney_update_flag"
ON public.cases
FOR UPDATE TO authenticated
USING (
  get_user_role(auth.uid()) = 'attorney'
  AND attorney_id = get_user_firm_id(auth.uid())
)
WITH CHECK (
  get_user_role(auth.uid()) = 'attorney'
  AND attorney_id = get_user_firm_id(auth.uid())
);
