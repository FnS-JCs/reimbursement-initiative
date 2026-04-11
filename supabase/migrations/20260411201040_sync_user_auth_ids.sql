CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM public;

CREATE OR REPLACE FUNCTION private.set_auth_user_id_from_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  matched_auth_user_id uuid;
BEGIN
  IF NEW.auth_user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT au.id
    INTO matched_auth_user_id
    FROM auth.users AS au
    WHERE lower(au.email) = lower(NEW.email)
    LIMIT 1;

    IF matched_auth_user_id IS NOT NULL THEN
      NEW.auth_user_id := matched_auth_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_public_user_auth_id_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.users
    SET auth_user_id = NEW.id
    WHERE lower(email) = lower(NEW.email)
      AND auth_user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_auth_user_id_from_email ON public.users;
CREATE TRIGGER set_auth_user_id_from_email
  BEFORE INSERT OR UPDATE OF email ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION private.set_auth_user_id_from_email();

DROP TRIGGER IF EXISTS sync_public_user_auth_id_from_auth ON auth.users;
CREATE TRIGGER sync_public_user_auth_id_from_auth
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_public_user_auth_id_from_auth();

UPDATE public.users AS u
SET auth_user_id = au.id
FROM auth.users AS au
WHERE lower(u.email) = lower(au.email)
  AND u.auth_user_id IS NULL;
