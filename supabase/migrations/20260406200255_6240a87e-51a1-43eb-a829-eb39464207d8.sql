-- Allow any authenticated user to see messages they created
CREATE POLICY "video_creator_select"
ON public.video_messages
FOR SELECT
TO authenticated
USING (created_by = auth.uid());