DROP POLICY IF EXISTS "bill_comments_select_by_role" ON public.bill_comments;

CREATE POLICY "bill_comments_select_by_role"
  ON public.bill_comments
  FOR SELECT
  USING (
    public.is_fns_user()
    OR EXISTS (
      SELECT 1
      FROM public.bills b
      WHERE b.id = bill_comments.bill_id
        AND (
          (
            bill_comments.author_role = 'fns'
            AND (
              public.is_sc_for_bill(b.sc_id)
              OR EXISTS (
                SELECT 1
                FROM public.users u
                WHERE u.id = b.user_id
                  AND u.auth_user_id = auth.uid()
                  AND lower(u.role) = 'sc'
              )
            )
          )
          OR (
            bill_comments.author_role = 'sc'
            AND b.status = 'rejected'
            AND (
              public.is_sc_for_bill(b.sc_id)
              OR EXISTS (
                SELECT 1
                FROM public.users u
                WHERE u.id = b.user_id
                  AND u.auth_user_id = auth.uid()
              )
            )
          )
        )
    )
  );
