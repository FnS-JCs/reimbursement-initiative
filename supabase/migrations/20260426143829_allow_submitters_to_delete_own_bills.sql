DROP POLICY IF EXISTS "bills_delete_own_submitted" ON public.bills;

CREATE POLICY "bills_delete_own_submitted"
  ON public.bills
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE public.users.id = bills.user_id
        AND public.users.auth_user_id = auth.uid()
    )
  );
