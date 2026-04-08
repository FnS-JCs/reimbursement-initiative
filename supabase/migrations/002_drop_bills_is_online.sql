-- Remove legacy online transaction flag from bills.
-- This is safe to run even if the column is already absent.

ALTER TABLE public.bills
DROP COLUMN IF EXISTS is_online;
