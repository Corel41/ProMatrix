DROP POLICY IF EXISTS branch_memberships_select_own_and_managed ON public.branch_memberships;

CREATE POLICY branch_memberships_select_own_and_managed
ON public.branch_memberships
FOR SELECT
USING (
    user_id = auth.uid()
    OR branch_id IN (SELECT public.get_my_branch_ids())
);
