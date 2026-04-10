DROP POLICY IF EXISTS sc_cabinets_all_fns ON public.sc_cabinets;
DROP POLICY IF EXISTS sc_cabinets_select_authenticated ON public.sc_cabinets;

CREATE POLICY sc_cabinets_select_authenticated
  ON public.sc_cabinets
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY sc_cabinets_insert_fns
  ON public.sc_cabinets
  FOR INSERT
  WITH CHECK (public.is_fns_user());

CREATE POLICY sc_cabinets_update_fns
  ON public.sc_cabinets
  FOR UPDATE
  USING (public.is_fns_user())
  WITH CHECK (public.is_fns_user());

CREATE POLICY sc_cabinets_delete_fns
  ON public.sc_cabinets
  FOR DELETE
  USING (public.is_fns_user());

CREATE UNIQUE INDEX IF NOT EXISTS sc_cabinets_user_id_unique
  ON public.sc_cabinets (user_id)
  WHERE user_id IS NOT NULL;
