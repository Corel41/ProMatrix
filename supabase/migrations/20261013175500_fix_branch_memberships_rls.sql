-- Migration: Fix infinite recursion in branch_memberships RLS policy
-- The previous policy evaluated a subquery directly on branch_memberships inside its own SELECT policy.
-- Using the SECURITY DEFINER function get_my_branch_ids() bypasses recursive policy evaluation.

DROP POLICY IF EXISTS branch_memberships_select_own_and_managed ON public.branch_memberships;

CREATE POLICY branch_memberships_select_own_and_managed
ON public.branch_memberships
FOR SELECT
USING (
    user_id = auth.uid()
    OR branch_id IN (SELECT public.get_my_branch_ids())
);
