CREATE POLICY "video_provider_insert"
ON public.video_messages
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'provider'
  AND created_by = auth.uid()
);