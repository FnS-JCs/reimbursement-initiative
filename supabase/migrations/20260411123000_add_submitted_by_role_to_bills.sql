ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS submitted_by_role text;

UPDATE public.bills b
SET submitted_by_role = CASE
  WHEN lower(u.role) IN ('f_s', 'fns') THEN 'fns'
  WHEN lower(u.role) = 'sc' THEN 'sc'
  ELSE 'jc'
END
FROM public.users u
WHERE u.id = b.user_id
  AND b.submitted_by_role IS NULL;

ALTER TABLE public.bills
ALTER COLUMN submitted_by_role SET DEFAULT 'jc';

ALTER TABLE public.bills
ALTER COLUMN submitted_by_role SET NOT NULL;
