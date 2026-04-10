CREATE OR REPLACE FUNCTION public.is_fns_user()
RETURNS boolean
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND lower(role) IN ('f_s', 'fns')
  );
$function$
LANGUAGE sql
SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_sc_for_bill(bill_sc_id uuid)
RETURNS boolean
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.sc_cabinets AS sc
    JOIN public.users AS u
      ON u.id = sc.user_id
    WHERE sc.id = bill_sc_id
      AND u.auth_user_id = auth.uid()
  );
$function$
LANGUAGE sql
SECURITY DEFINER;

DROP POLICY IF EXISTS bills_insert_own ON public.bills;
DROP POLICY IF EXISTS bills_select_own_or_assigned ON public.bills;
DROP POLICY IF EXISTS bills_update_assigned_sc ON public.bills;

CREATE POLICY bills_insert_own
  ON public.bills
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = bills.user_id
        AND auth_user_id = auth.uid()
    )
  );

CREATE POLICY bills_select_own_or_assigned
  ON public.bills
  FOR SELECT
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

CREATE POLICY bills_update_assigned_sc
  ON public.bills
  FOR UPDATE
  USING (
    public.is_sc_for_bill(sc_id)
    OR public.is_fns_user()
  );
