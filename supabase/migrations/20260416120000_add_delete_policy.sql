-- Add DELETE policy for bills table
CREATE POLICY bills_delete_fns
  ON public.bills
  FOR DELETE
  USING (
    public.is_fns_user()
  );

-- Also ensure FnS can update any bill (which they already can, but let's be explicit if needed)
-- The existing bills_update_assigned_sc already covers is_fns_user()
