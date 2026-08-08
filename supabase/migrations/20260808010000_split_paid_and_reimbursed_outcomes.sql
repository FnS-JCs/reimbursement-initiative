-- Paid is the SC's decision for the JC. Reimbursed is FnS's decision for the SC.
-- Each is independent: NULL means pending, the named value means completed, and
-- 'rejected' means rejected by the role responsible for that decision.

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS paid text,
  ADD COLUMN IF NOT EXISTS reimbursed text;

ALTER TABLE public.bills
  DROP CONSTRAINT IF EXISTS bills_paid_check,
  DROP CONSTRAINT IF EXISTS bills_reimbursed_check;

ALTER TABLE public.bills
  ADD CONSTRAINT bills_paid_check CHECK (paid IN ('paid', 'rejected')),
  ADD CONSTRAINT bills_reimbursed_check CHECK (reimbursed IN ('reimbursed', 'rejected'));

-- Preserve the meaning of the previous combined reimbursement implementation.
UPDATE public.bills
SET paid = 'paid'
WHERE is_reimbursed = true
  AND reimbursed_by_role = 'sc'
  AND paid IS NULL;

UPDATE public.bills
SET reimbursed = 'reimbursed'
WHERE is_reimbursed = true
  AND reimbursed_by_role = 'fns'
  AND reimbursed IS NULL;

UPDATE public.bills
SET paid = 'rejected'
WHERE status = 'rejected'
  AND rejected_by_role = 'sc'
  AND paid IS NULL;

UPDATE public.bills
SET reimbursed = 'rejected'
WHERE status = 'rejected'
  AND rejected_by_role = 'fns'
  AND reimbursed IS NULL;

-- Status is retained for backwards compatibility with existing inserts, but no
-- longer carries reimbursement or rejection state.
UPDATE public.bills SET status = 'pending' WHERE status <> 'pending';

ALTER TABLE public.bills
  DROP COLUMN IF EXISTS is_reimbursed,
  DROP COLUMN IF EXISTS reimbursed_by_role,
  DROP COLUMN IF EXISTS rejected_by_role;

CREATE OR REPLACE FUNCTION public.can_view_bill(bill_row public.bills)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.is_fns_user() OR public.is_sc_for_bill(bill_row.sc_id) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = bill_row.user_id
      AND auth_user_id = auth.uid()
  );
END;
$$;

-- RLS determines which rows a role may update; this trigger also enforces which
-- of the two independent outcomes that role is allowed to change.
CREATE OR REPLACE FUNCTION public.enforce_bill_outcome_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.paid IS DISTINCT FROM OLD.paid
    AND NOT public.is_sc_for_bill(OLD.sc_id) THEN
    RAISE EXCEPTION 'Only the assigned SC can update the paid outcome';
  END IF;

  IF NEW.reimbursed IS DISTINCT FROM OLD.reimbursed
    AND NOT public.is_fns_user() THEN
    RAISE EXCEPTION 'Only FnS can update the reimbursed outcome';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bill_outcome_updates ON public.bills;
CREATE TRIGGER enforce_bill_outcome_updates
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_bill_outcome_updates();

-- FnS rejection comments belong to FnS and the assigned SC. SC rejection
-- comments are additionally visible to the bill's submitter.
DROP POLICY IF EXISTS "bill_comments_select_by_role" ON public.bill_comments;
CREATE POLICY "bill_comments_select_by_role"
  ON public.bill_comments
  FOR SELECT
  USING (
    public.is_fns_user()
    OR EXISTS (
      SELECT 1
      FROM public.bills b
      WHERE b.id = bill_comments.bill_id
        AND (
          (bill_comments.author_role = 'fns' AND b.reimbursed = 'rejected' AND public.is_sc_for_bill(b.sc_id))
          OR
          (bill_comments.author_role = 'sc' AND b.paid = 'rejected' AND (
            public.is_sc_for_bill(b.sc_id)
            OR EXISTS (
              SELECT 1 FROM public.users u
              WHERE u.id = b.user_id AND u.auth_user_id = auth.uid()
            )
          ))
        )
    )
  );
