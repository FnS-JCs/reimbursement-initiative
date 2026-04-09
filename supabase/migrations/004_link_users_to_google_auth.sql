-- Support preloaded whitelisted users that are linked to Supabase Auth only after
-- the first approved Google login.

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_auth_user_id_fkey'
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_auth_user_id_fkey
    FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

UPDATE public.users AS u
SET auth_user_id = u.id
WHERE auth_user_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM auth.users AS au
    WHERE au.id = u.id
  );

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "FnS can view all users" ON public.users;
DROP POLICY IF EXISTS "FnS can insert users" ON public.users;
DROP POLICY IF EXISTS "FnS can update users" ON public.users;
DROP POLICY IF EXISTS "JC can view own bills" ON public.bills;
DROP POLICY IF EXISTS "SC can view own bills and bills assigned to them" ON public.bills;
DROP POLICY IF EXISTS "FnS can view all non-voided bills" ON public.bills;
DROP POLICY IF EXISTS "SC can update physical_received, is_reimbursed, rejection_reason" ON public.bills;
DROP POLICY IF EXISTS "FnS can update all bill fields" ON public.bills;

CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "FnS can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

CREATE POLICY "FnS can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

CREATE POLICY "FnS can update users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

CREATE POLICY "JC can view own bills"
  ON public.bills FOR SELECT
  USING (
    submitted_by = (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
    AND is_voided = false
  );

CREATE POLICY "SC can view own bills and bills assigned to them"
  ON public.bills FOR SELECT
  USING (
    (
      submitted_by = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
      OR sc_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
    AND is_voided = false
  );

CREATE POLICY "FnS can view all non-voided bills"
  ON public.bills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );

CREATE POLICY "SC can update physical_received, is_reimbursed, rejection_reason"
  ON public.bills FOR UPDATE
  USING (
    sc_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    AND is_voided = false
  )
  WITH CHECK (
    sc_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "FnS can update all bill fields"
  ON public.bills FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid() AND role = 'fns'
    )
  );
