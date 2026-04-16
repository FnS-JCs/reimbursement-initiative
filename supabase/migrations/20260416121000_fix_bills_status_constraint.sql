-- Fix the bills_status_check constraint to allow 'rejected' status
-- This constraint was likely added manually in the dashboard or an unrecorded migration

DO $$
BEGIN
    -- 1. Drop the old constraint if it exists
    -- The error message specifically named "bills_status_check"
    ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_status_check;

    -- 2. Add the updated constraint with all allowed statuses
    ALTER TABLE public.bills 
    ADD CONSTRAINT bills_status_check 
    CHECK (status IN ('pending', 'physical_received', 'reimbursed', 'rejected'));

    -- 3. Set a default status for existing and new rows
    ALTER TABLE public.bills ALTER COLUMN status SET DEFAULT 'pending';
END $$;
