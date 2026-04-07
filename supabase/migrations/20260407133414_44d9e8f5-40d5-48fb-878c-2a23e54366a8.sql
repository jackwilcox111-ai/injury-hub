CREATE POLICY "documents_patient_insert"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'patient'
  AND uploader_id = auth.uid()
  AND case_id IN (
    SELECT pp.case_id FROM patient_profiles pp WHERE pp.profile_id = auth.uid()
  )
);