-- FnS cycles UI (fns-cycles.tsx) treats is_active as part of the cycle model
-- (New Cycle, Set Active, Close Cycle). The column was missing from the table.
ALTER TABLE public.reimbursement_cycles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;
