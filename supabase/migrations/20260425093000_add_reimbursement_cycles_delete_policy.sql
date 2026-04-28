DROP POLICY IF EXISTS "FnS can delete reimbursement cycles" ON public.reimbursement_cycles;

CREATE POLICY "FnS can delete reimbursement cycles"
  ON public.reimbursement_cycles
  FOR DELETE
  USING (public.is_fns_user());
