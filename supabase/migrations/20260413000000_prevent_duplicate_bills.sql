-- Prevent duplicate bills from the same vendor
-- A combination of vendor_id and bill_number must be unique
-- We also use a case-insensitive check and trim whitespace to be more robust

-- First, let's create a unique index that handles case-insensitivity and trimming
-- This is safer than a simple UNIQUE constraint because it handles data variations better

CREATE UNIQUE INDEX idx_bills_unique_vendor_bill_number 
ON bills (vendor_id, TRIM(UPPER(bill_number)));

-- Note: If there are existing duplicates, this migration will fail.
-- In that case, the user would need to clean up existing duplicates before applying this.
