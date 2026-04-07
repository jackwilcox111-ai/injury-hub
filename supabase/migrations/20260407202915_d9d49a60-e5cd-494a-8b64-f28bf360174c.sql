-- Allow patients to read documents in their case folder
CREATE POLICY "Patients can read their documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND get_user_role(auth.uid()) = 'patient'
);

-- Allow patients to upload documents to their case folder
CREATE POLICY "Patients can upload their documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND get_user_role(auth.uid()) = 'patient'
);