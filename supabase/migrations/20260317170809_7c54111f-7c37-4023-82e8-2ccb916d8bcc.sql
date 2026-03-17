
-- Allow providers to view liens for their assigned cases
CREATE POLICY "liens_provider_select"
ON public.liens
FOR SELECT
TO authenticated
USING (
  (case_id IN (SELECT id FROM cases WHERE provider_id = get_user_provider_id(auth.uid())))
  AND (get_user_role(auth.uid()) = 'provider')
);

-- Allow providers to view records for their assigned cases
CREATE POLICY "records_provider_select"
ON public.records
FOR SELECT
TO authenticated
USING (
  (case_id IN (SELECT id FROM cases WHERE provider_id = get_user_provider_id(auth.uid())))
  AND (get_user_role(auth.uid()) = 'provider')
);

-- Allow providers to insert documents (upload medical records)
CREATE POLICY "documents_provider_insert"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  (get_user_role(auth.uid()) = 'provider')
  AND (uploader_id = auth.uid())
);

-- Allow providers to view video messages sent to them
CREATE POLICY "video_provider_recipient"
ON public.video_messages
FOR SELECT
TO authenticated
USING (
  (recipient_id = auth.uid())
  AND (get_user_role(auth.uid()) = 'provider')
);

-- Allow providers to update video messages (mark as viewed)
CREATE POLICY "video_provider_update_viewed"
ON public.video_messages
FOR UPDATE
TO authenticated
USING (
  (recipient_id = auth.uid())
  AND (get_user_role(auth.uid()) = 'provider')
);

-- Allow providers to insert charges for their assigned cases
CREATE POLICY "charges_provider_insert"
ON public.charges
FOR INSERT
TO authenticated
WITH CHECK (
  (get_user_role(auth.uid()) = 'provider')
  AND (provider_id = get_user_provider_id(auth.uid()))
);

-- Allow providers to update their appointment status
CREATE POLICY "appointments_provider_update"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  (provider_id = get_user_provider_id(auth.uid()))
  AND (get_user_role(auth.uid()) = 'provider')
);
