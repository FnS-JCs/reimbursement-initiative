-- Fix RLS consistency for FnS role checks
-- Use a unified function for checking FnS status that handles all variants

CREATE OR REPLACE FUNCTION public.is_fns_user()
RETURNS boolean
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND (
        lower(role) IN ('f_s', 'fns', 'fs', 'fnss')
        OR role ILIKE 'fn%'
      )
      AND is_active = true
  );
$function$
LANGUAGE sql
SECURITY DEFINER;

-- Update all policies to use this unified check
-- Users table
DROP POLICY IF EXISTS "FnS can view all users" ON public.users;
CREATE POLICY "FnS can view all users"
  ON public.users FOR SELECT
  USING (public.is_fns_user());

DROP POLICY IF EXISTS "FnS can insert users" ON public.users;
CREATE POLICY "FnS can insert users"
  ON public.users FOR INSERT
  WITH CHECK (public.is_fns_user());

DROP POLICY IF EXISTS "FnS can update users" ON public.users;
CREATE POLICY "FnS can update users"
  ON public.users FOR UPDATE
  USING (public.is_fns_user());

-- Bills table
DROP POLICY IF EXISTS "FnS can view all non-voided bills" ON public.bills;
CREATE POLICY "FnS can view all non-voided bills"
  ON public.bills FOR SELECT
  USING (public.is_fns_user());

DROP POLICY IF EXISTS "FnS can update all bill fields" ON public.bills;
CREATE POLICY "FnS can update all bill fields"
  ON public.bills FOR UPDATE
  USING (public.is_fns_user());

DROP POLICY IF EXISTS "bills_select_own_or_assigned" ON public.bills;
CREATE POLICY "bills_select_own_or_assigned"
  ON public.bills FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = bills.user_id
        AND auth_user_id = auth.uid()
    )
    OR public.is_sc_for_bill(sc_id)
    OR public.is_fns_user()
  );

DROP POLICY IF EXISTS "bills_update_assigned_sc" ON public.bills;
CREATE POLICY "bills_update_assigned_sc"
  ON public.bills FOR UPDATE
  USING (
    public.is_sc_for_bill(sc_id)
    OR public.is_fns_user()
  );

-- Ensure DELETE is also covered
DROP POLICY IF EXISTS "bills_delete_fns" ON public.bills;
CREATE POLICY "bills_delete_fns"
  ON public.bills FOR DELETE
  USING (public.is_fns_user());

-- Sync auth_user_id for all active users based on email if not set
UPDATE public.users AS u
SET auth_user_id = au.id
FROM auth.users AS au
WHERE lower(u.email) = lower(au.email)
  AND u.auth_user_id IS NULL;
