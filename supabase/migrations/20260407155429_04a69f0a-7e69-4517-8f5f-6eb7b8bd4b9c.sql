
-- Patient can insert messages
CREATE POLICY "video_patient_insert" ON public.video_messages
FOR INSERT TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'patient'
  AND created_by = auth.uid()
);

-- Patient can mark their received messages as viewed
CREATE POLICY "video_patient_update_viewed" ON public.video_messages
FOR UPDATE TO authenticated
USING (
  recipient_id = auth.uid()
  AND get_user_role(auth.uid()) = 'patient'
);
