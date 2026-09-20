-- ADR 0026 / 02 — local Postgres + Vault smoke for the Proxima API key.
-- Scratch script, not a migration. Leaves no rows (transaction rolled back).
--
--   npm run test:db-smoke
--
-- Exercises the same RPCs as Hevy (insert_secret / read_secret / delete_secret)
-- plus resolve_proxima_api_key. Prints PASS/FAIL; raises on first fail.

BEGIN;

DO $$
DECLARE
  v_user_a uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  v_user_b uuid := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  v_proxima text := 'pxa_smoke_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  v_proxima_2 text := 'pxa_smoke_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  v_hevy text := 'hevy-smoke-key-not-a-proxima-token';
  v_name text;
  v_read text;
  v_deleted text;
  v_resolved uuid;
  v_raised boolean;
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES
    (v_user_a, 'smoke-proxima-key-a@example.com', 'smoke_proxima_key_a'),
    (v_user_b, 'smoke-proxima-key-b@example.com', 'smoke_proxima_key_b');

  -- 1. Unauthenticated insert_secret raises
  PERFORM set_config('request.jwt.claims', '{}', true);
  v_raised := false;
  BEGIN
    PERFORM public.insert_secret(v_proxima, 'proxima_api_key_' || v_user_a::text);
  EXCEPTION WHEN others THEN
    v_raised := true;
    IF SQLERRM NOT LIKE '%authentication required%' THEN
      RAISE EXCEPTION 'FAIL 1: wrong error when unauthenticated: %', SQLERRM;
    END IF;
  END;
  IF NOT v_raised THEN
    RAISE EXCEPTION 'FAIL 1: unauthenticated insert_secret accepted';
  END IF;
  RAISE NOTICE 'PASS 1: unauthenticated insert_secret raises';

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user_a, 'role', 'authenticated')::text,
    true
  );

  -- 2. Insert Proxima row
  PERFORM public.insert_secret(v_proxima, 'proxima_api_key_' || v_user_a::text);

  SELECT s.name INTO v_name
  FROM vault.decrypted_secrets AS s
  WHERE s.decrypted_secret = v_proxima;

  IF v_name IS DISTINCT FROM 'proxima_api_key_' || v_user_a::text THEN
    RAISE EXCEPTION 'FAIL 2: vault name = %, expected proxima_api_key_%', v_name, v_user_a;
  END IF;
  RAISE NOTICE 'PASS 2: insert_secret writes proxima_api_key_{user}';

  -- 3. Default insert_secret still writes the Hevy row (distinct)
  PERFORM public.insert_secret(v_hevy);

  SELECT s.name INTO v_name
  FROM vault.decrypted_secrets AS s
  WHERE s.decrypted_secret = v_hevy;

  IF v_name IS DISTINCT FROM 'hevy_api_key_' || v_user_a::text THEN
    RAISE EXCEPTION 'FAIL 3: default insert_secret name = %, expected hevy_api_key_%',
      v_name, v_user_a;
  END IF;
  RAISE NOTICE 'PASS 3: omit secret_name still writes hevy_api_key_{user}';

  -- 4. read_secret returns the Proxima token
  SELECT public.read_secret('proxima_api_key_' || v_user_a::text) INTO v_read;
  IF v_read IS DISTINCT FROM v_proxima THEN
    RAISE EXCEPTION 'FAIL 4: read_secret = %, expected minted token', v_read;
  END IF;
  RAISE NOTICE 'PASS 4: read_secret returns the Proxima token';

  -- 5. Invalid vault name rejected
  v_raised := false;
  BEGIN
    PERFORM public.insert_secret('nope', 'public_api_key_' || v_user_a::text);
  EXCEPTION WHEN others THEN
    v_raised := true;
    IF SQLERRM NOT LIKE '%invalid secret name%' THEN
      RAISE EXCEPTION 'FAIL 5: wrong error for invalid name: %', SQLERRM;
    END IF;
  END;
  IF NOT v_raised THEN
    RAISE EXCEPTION 'FAIL 5: public_api_key_ name accepted';
  END IF;
  RAISE NOTICE 'PASS 5: insert_secret rejects names other than hevy/proxima';

  -- 6. Cannot write another user's proxima name
  v_raised := false;
  BEGIN
    PERFORM public.insert_secret(v_proxima_2, 'proxima_api_key_' || v_user_b::text);
  EXCEPTION WHEN others THEN
    v_raised := true;
    IF SQLERRM NOT LIKE '%invalid secret name%' THEN
      RAISE EXCEPTION 'FAIL 6: wrong error writing B''s name as A: %', SQLERRM;
    END IF;
  END;
  IF NOT v_raised THEN
    RAISE EXCEPTION 'FAIL 6: user A wrote proxima_api_key_{B}';
  END IF;
  RAISE NOTICE 'PASS 6: insert_secret cannot target another user''s name';

  -- 7. Bearer resolve: Proxima token → A; Hevy token and unknown → null
  SELECT public.resolve_proxima_api_key(v_proxima) INTO v_resolved;
  IF v_resolved IS DISTINCT FROM v_user_a THEN
    RAISE EXCEPTION 'FAIL 7: resolve Proxima token = %, expected %', v_resolved, v_user_a;
  END IF;

  SELECT public.resolve_proxima_api_key(v_hevy) INTO v_resolved;
  IF v_resolved IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 7: Hevy token resolved to %', v_resolved;
  END IF;

  SELECT public.resolve_proxima_api_key('pxa_unknown') INTO v_resolved;
  IF v_resolved IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 7: unknown token resolved to %', v_resolved;
  END IF;
  RAISE NOTICE 'PASS 7: resolve maps Proxima token to A; Hevy/unknown stay null';

  -- 8. User B cannot read A's Proxima secret
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user_b, 'role', 'authenticated')::text,
    true
  );
  v_raised := false;
  BEGIN
    PERFORM public.read_secret('proxima_api_key_' || v_user_a::text);
  EXCEPTION WHEN others THEN
    v_raised := true;
  END;
  IF NOT v_raised THEN
    RAISE EXCEPTION 'FAIL 8: user B read A''s Proxima secret';
  END IF;
  RAISE NOTICE 'PASS 8: read_secret is owner-only';

  -- 9. User B cannot delete A's Proxima secret
  SELECT public.delete_secret('proxima_api_key_' || v_user_a::text) INTO v_deleted;
  IF v_deleted IS DISTINCT FROM 'no matching secret found' THEN
    RAISE EXCEPTION 'FAIL 9: user B delete returned %', v_deleted;
  END IF;
  RAISE NOTICE 'PASS 9: delete_secret as B is a no-op';

  -- 10. Owner revoke, then remint
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user_a, 'role', 'authenticated')::text,
    true
  );

  SELECT public.delete_secret('proxima_api_key_' || v_user_a::text) INTO v_deleted;
  IF v_deleted IS DISTINCT FROM 'secret deleted' THEN
    RAISE EXCEPTION 'FAIL 10: owner delete returned %', v_deleted;
  END IF;

  v_raised := false;
  BEGIN
    PERFORM public.read_secret('proxima_api_key_' || v_user_a::text);
  EXCEPTION WHEN others THEN
    v_raised := true;
  END;
  IF NOT v_raised THEN
    RAISE EXCEPTION 'FAIL 10: read_secret still succeeded after delete';
  END IF;

  SELECT public.resolve_proxima_api_key(v_proxima) INTO v_resolved;
  IF v_resolved IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 10: revoked token still resolved to %', v_resolved;
  END IF;
  RAISE NOTICE 'PASS 10: delete_secret removes the row; resolve of old token is null';

  PERFORM public.insert_secret(v_proxima_2, 'proxima_api_key_' || v_user_a::text);

  SELECT public.read_secret('proxima_api_key_' || v_user_a::text) INTO v_read;
  IF v_read IS DISTINCT FROM v_proxima_2 THEN
    RAISE EXCEPTION 'FAIL 11: remint read_secret = %, expected replacement token', v_read;
  END IF;

  SELECT public.resolve_proxima_api_key(v_proxima_2) INTO v_resolved;
  IF v_resolved IS DISTINCT FROM v_user_a THEN
    RAISE EXCEPTION 'FAIL 11: remint resolve = %, expected %', v_resolved, v_user_a;
  END IF;

  SELECT public.resolve_proxima_api_key(v_proxima) INTO v_resolved;
  IF v_resolved IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 11: old token resolved after remint';
  END IF;
  RAISE NOTICE 'PASS 11: remint stores a new token; old Bearer no longer maps';

  RAISE NOTICE 'All proxima_api_key vault smoke assertions passed.';
END $$;

ROLLBACK;
