
-- Drop the overly permissive policies on referrals
DROP POLICY IF EXISTS "Authenticated users can view referrals" ON public.referrals;
DROP POLICY IF EXISTS "Authenticated users can update referrals" ON public.referrals;
DROP POLICY IF EXISTS "Authenticated users can insert referrals" ON public.referrals;

-- Admin full access
CREATE POLICY "referrals_admin_all" ON public.referrals FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Care manager full access
CREATE POLICY "referrals_cm_all" ON public.referrals FOR ALL TO authenticated
  USING (get_user_role(auth.uid()) = 'care_manager')
  WITH CHECK (get_user_role(auth.uid()) = 'care_manager');

-- Attorney can view referrals for their firm's cases
CREATE POLICY "referrals_attorney_select" ON public.referrals FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) = 'attorney'
    AND case_id IN (SELECT id FROM cases WHERE attorney_id = get_user_firm_id(auth.uid()))
  );

-- Provider can view their own referrals
CREATE POLICY "referrals_provider_select" ON public.referrals FOR SELECT TO authenticated
  USING (
    get_user_role(auth.uid()) = 'provider'
    AND provider_id = get_user_provider_id(auth.uid())
  );

-- Provider can update their own referrals (accept/decline)
CREATE POLICY "referrals_provider_update" ON public.referrals FOR UPDATE TO authenticated
  USING (
    get_user_role(auth.uid()) = 'provider'
    AND provider_id = get_user_provider_id(auth.uid())
  )
  WITH CHECK (
    get_user_role(auth.uid()) = 'provider'
    AND provider_id = get_user_provider_id(auth.uid())
  );
