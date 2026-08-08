-- Add cycle_id to bills, linking each bill to a reimbursement cycle
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.reimbursement_cycles(id);

CREATE INDEX IF NOT EXISTS idx_bills_cycle_id ON public.bills(cycle_id);

-- Auto-assign the active cycle to new bills (restores 001_initial_schema behavior)
CREATE OR REPLACE FUNCTION public.set_default_cycle_id()
RETURNS TRIGGER AS $$
DECLARE
  active_cycle_id UUID;
BEGIN
  IF NEW.cycle_id IS NULL THEN
    SELECT id INTO active_cycle_id
    FROM public.reimbursement_cycles
    WHERE is_active = true AND is_closed = false
    LIMIT 1;
    NEW.cycle_id := active_cycle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bill_default_cycle ON public.bills;
CREATE TRIGGER set_bill_default_cycle
  BEFORE INSERT ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_cycle_id();
