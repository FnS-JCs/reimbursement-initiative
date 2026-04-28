DO $$
BEGIN
    UPDATE public.bills
    SET status = 'reimbursed'
    WHERE status = 'physical_received';

    ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_status_check;

    ALTER TABLE public.bills
    ADD CONSTRAINT bills_status_check
    CHECK (status IN ('pending', 'reimbursed', 'rejected'));

    ALTER TABLE public.bills
    ALTER COLUMN status SET DEFAULT 'pending';
END $$;

