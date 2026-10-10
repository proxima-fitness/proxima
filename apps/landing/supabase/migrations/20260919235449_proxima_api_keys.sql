-- Reuse Hevy vault RPCs for the Proxima API key.
-- insert_secret / read_secret / delete_secret stay the write-read-delete path.
-- Distinct vault row: proxima_api_key_{userId} vs hevy_api_key_{userId}.
-- resolve_proxima_api_key is the only new function: Bearer is key → user (Hevy never does that).

DROP FUNCTION IF EXISTS public.insert_secret(text);

CREATE FUNCTION public.insert_secret(secret text, secret_name text DEFAULT NULL)
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

CREATE OR REPLACE FUNCTION public.resolve_proxima_api_key(p_secret text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_name text;
  v_user_id uuid;
BEGIN
  IF p_secret IS NULL OR btrim(p_secret) = '' THEN
    RETURN NULL;
  END IF;

  SELECT s.name INTO v_name
  FROM vault.decrypted_secrets AS s
  WHERE s.decrypted_secret = p_secret
    AND s.name LIKE 'proxima_api_key_%'
  LIMIT 1;

  IF v_name IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_user_id := substring(v_name FROM length('proxima_api_key_') + 1)::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN NULL;
  END;

  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION public.resolve_proxima_api_key(text) IS
  'Service-role Bearer lookup. Matches proxima_api_key_* vault rows only; never Hevy keys.';

REVOKE ALL ON FUNCTION public.resolve_proxima_api_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_proxima_api_key(text) TO service_role;
