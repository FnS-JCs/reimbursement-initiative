-- Allow bills.process_type to store active process types managed in the app.
-- The existing check constraint blocks valid dropdown values when FnS adds or edits process types.

ALTER TABLE public.bills
DROP CONSTRAINT IF EXISTS bills_process_type_check;
