-- Fold Proxima keys onto Hevy's insert_secret / read_secret / delete_secret.
-- Drops the extra RPCs from the first cut of this slice.

DROP FUNCTION IF EXISTS public.insert_proxima_api_key(text);
DROP FUNCTION IF EXISTS public.has_proxima_api_key();

DROP FUNCTION IF EXISTS public.insert_secret(text);

CREATE OR REPLACE FUNCTION public.insert_secret(secret text, secret_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  v_name := COALESCE(NULLIF(btrim(secret_name), ''), 'hevy_api_key_' || v_uid::text);

  IF v_name NOT IN (
    'hevy_api_key_' || v_uid::text,
    'proxima_api_key_' || v_uid::text
  ) THEN
    RAISE EXCEPTION 'invalid secret name';
  END IF;

  RETURN vault.create_secret(secret, v_name, v_uid::text);
END;
$$;

COMMENT ON FUNCTION public.insert_secret(text, text) IS
  'Vault write. Default name is hevy_api_key_{uid}. Proxima API keys pass proxima_api_key_{uid}.';

ALTER FUNCTION public.insert_secret(text, text) OWNER TO postgres;

GRANT ALL ON FUNCTION public.insert_secret(text, text) TO anon;
GRANT ALL ON FUNCTION public.insert_secret(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.insert_secret(text, text) TO service_role;
