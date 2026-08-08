ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS is_reimbursed boolean NOT NULL DEFAULT false;

ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS reimbursed_by_role text;

DO $$
BEGIN
  ALTER TABLE public.bills
  DROP CONSTRAINT IF EXISTS bills_reimbursed_by_role_check;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

ALTER TABLE public.bills
ADD CONSTRAINT bills_reimbursed_by_role_check
CHECK (reimbursed_by_role IN ('sc', 'fns'));

UPDATE public.bills
SET is_reimbursed = true,
    reimbursed_by_role = 'fns'
WHERE status = 'reimbursed'
  AND is_reimbursed = false;

CREATE OR REPLACE FUNCTION public.can_view_bill(bill_row public.bills)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  submitter_role text;
BEGIN
  SELECT lower(role)
  INTO submitter_role
  FROM public.users
  WHERE id = bill_row.user_id;

  IF public.is_fns_user() THEN
    RETURN NOT (
      bill_row.status = 'reimbursed'
      AND bill_row.reimbursed_by_role = 'sc'
    );
  END IF;

  IF public.is_sc_for_bill(bill_row.sc_id) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = bill_row.user_id
      AND auth_user_id = auth.uid()
  ) THEN
    IF submitter_role = 'jc' THEN
      IF bill_row.status = 'rejected' AND bill_row.rejected_by_role = 'fns' THEN
        RETURN FALSE;
      END IF;

      IF bill_row.status = 'reimbursed' AND bill_row.reimbursed_by_role = 'fns' THEN
        RETURN FALSE;
      END IF;
    END IF;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

DROP POLICY IF EXISTS bills_select_own_or_assigned ON public.bills;

CREATE POLICY bills_select_own_or_assigned
  ON public.bills
  FOR SELECT
  USING (public.can_view_bill(bills));
