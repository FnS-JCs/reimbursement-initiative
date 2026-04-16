-- Add rejected_by_role to bills table to distinguish who rejected it
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS rejected_by_role text;

-- Add check constraint for the new column
ALTER TABLE public.bills
ADD CONSTRAINT bills_rejected_by_role_check
CHECK (rejected_by_role IN ('sc', 'fns'));
