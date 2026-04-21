CREATE TABLE IF NOT EXISTS public.bill_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  author_role text NOT NULL CHECK (author_role IN ('fns', 'sc')),
  body text NOT NULL CHECK (length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bill_id, author_role)
);

CREATE INDEX IF NOT EXISTS idx_bill_comments_bill_id
  ON public.bill_comments(bill_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bill_comments_updated_at ON public.bill_comments;
CREATE TRIGGER update_bill_comments_updated_at
  BEFORE UPDATE ON public.bill_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.bill_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_comments_select_by_role"
  ON public.bill_comments
  FOR SELECT
  USING (
    public.is_fns_user()
    OR EXISTS (
      SELECT 1
      FROM public.bills b
      WHERE b.id = bill_comments.bill_id
        AND b.status = 'rejected'
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

CREATE POLICY "bill_comments_insert_by_role"
  ON public.bill_comments
  FOR INSERT
  WITH CHECK (
    (
      author_role = 'fns'
      AND public.is_fns_user()
    )
    OR (
      author_role = 'sc'
      AND EXISTS (
        SELECT 1
        FROM public.bills b
        WHERE b.id = bill_comments.bill_id
          AND public.is_sc_for_bill(b.sc_id)
          AND NOT EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = b.user_id
              AND u.auth_user_id = auth.uid()
          )
      )
    )
  );

CREATE POLICY "bill_comments_update_by_role"
  ON public.bill_comments
  FOR UPDATE
  USING (
    (
      author_role = 'fns'
      AND public.is_fns_user()
    )
    OR (
      author_role = 'sc'
      AND EXISTS (
        SELECT 1
        FROM public.bills b
        WHERE b.id = bill_comments.bill_id
          AND public.is_sc_for_bill(b.sc_id)
      )
    )
  )
  WITH CHECK (
    (
      author_role = 'fns'
      AND public.is_fns_user()
    )
    OR (
      author_role = 'sc'
      AND EXISTS (
        SELECT 1
        FROM public.bills b
        WHERE b.id = bill_comments.bill_id
          AND public.is_sc_for_bill(b.sc_id)
          AND NOT EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = b.user_id
              AND u.auth_user_id = auth.uid()
          )
      )
    )
  );
