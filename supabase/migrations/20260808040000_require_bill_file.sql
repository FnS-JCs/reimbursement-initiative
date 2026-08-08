-- Enforce that every submitted bill has an uploaded file (photo/PDF)
ALTER TABLE public.bills
  ADD CONSTRAINT bills_file_url_required
  CHECK (file_url IS NOT NULL AND btrim(file_url) <> '');
