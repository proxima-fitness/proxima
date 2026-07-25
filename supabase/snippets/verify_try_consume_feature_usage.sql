-- Verifies try_consume_feature_usage (ADR 0019 / PRO-193).
--
-- Scratch script, not a migration: run it by hand after applying the migration.
--   npx supabase db query --local -f supabase/snippets/verify_try_consume_feature_usage.sql
--
-- Single statement (db query cannot run multi-command scripts). Snapshots the
-- chosen user's feature_usage rows, mutates under that snapshot, then restores.
-- Prints PASS/FAIL per assertion; raises on the first failure.

DO $$
DECLARE
  v_user_id uuid;
  v_current date := (date_trunc('month', now() AT TIME ZONE 'utc'))::date;
  v_max_llm integer;
  v_used integer;
  v_remaining integer;
  v_allowed boolean;
  v_raised boolean;
BEGIN
  SELECT id INTO v_user_id FROM public.users ORDER BY created_at LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'no public.users row to test with';
  END IF;

  CREATE TEMP TABLE _fu_snap ON COMMIT DROP AS
  SELECT * FROM public.feature_usage WHERE user_id = v_user_id;

  BEGIN
    -- Both RPCs read auth.uid().
    PERFORM set_config('request.jwt.claims',
                       json_build_object('sub', v_user_id, 'role', 'authenticated')::text,
                       true);

    DELETE FROM public.feature_usage WHERE user_id = v_user_id;

    SELECT max_monthly_llm_requests, remaining_llm_requests
      INTO v_max_llm, v_remaining
    FROM public.get_my_feature_limits();

    IF v_max_llm IS NULL OR v_max_llm < 1 THEN
      RAISE EXCEPTION 'FAIL setup: max_monthly_llm_requests = %', v_max_llm;
    END IF;

    -- 1. Under cap: consume returns true and remaining drops by one.
    SELECT allowed INTO v_allowed
    FROM public.try_consume_feature_usage('monthly_llm_requests');

    IF v_allowed IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'FAIL 1: under-cap consume returned allowed=%', v_allowed;
    END IF;

    SELECT monthly_llm_requests_used, remaining_llm_requests
      INTO v_used, v_remaining
    FROM public.get_my_feature_limits();

    IF v_used <> 1 THEN
      RAISE EXCEPTION 'FAIL 1: used=% after first consume, expected 1', v_used;
    END IF;
    IF v_remaining <> v_max_llm - 1 THEN
      RAISE EXCEPTION 'FAIL 1: remaining=% after first consume, expected %',
                      v_remaining, v_max_llm - 1;
    END IF;
    RAISE NOTICE 'PASS 1: under-cap consume allowed; remaining dropped by one';

    -- 2. At cap: next consume returns false and the counter does not move.
    UPDATE public.feature_usage
    SET monthly_llm_requests = v_max_llm
    WHERE user_id = v_user_id AND period_start = v_current;

    SELECT allowed INTO v_allowed
    FROM public.try_consume_feature_usage('monthly_llm_requests');

    IF v_allowed IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'FAIL 2: at-cap consume returned allowed=%', v_allowed;
    END IF;

    SELECT monthly_llm_requests INTO v_used
    FROM public.feature_usage
    WHERE user_id = v_user_id AND period_start = v_current;

    IF v_used <> v_max_llm THEN
      RAISE EXCEPTION 'FAIL 2: counter moved at cap (used=%), expected %', v_used, v_max_llm;
    END IF;
    RAISE NOTICE 'PASS 2: at-cap consume denied; monthly_llm_requests unchanged';

    -- 3. Unknown feature raises.
    v_raised := false;
    BEGIN
      PERFORM public.try_consume_feature_usage('not_a_real_meter');
    EXCEPTION WHEN others THEN
      v_raised := true;
      IF SQLERRM NOT LIKE 'unknown meter%' THEN
        RAISE EXCEPTION 'FAIL 3: wrong error for unknown meter: %', SQLERRM;
      END IF;
    END;
    IF NOT v_raised THEN
      RAISE EXCEPTION 'FAIL 3: unknown meter accepted';
    END IF;
    RAISE NOTICE 'PASS 3: unknown meter raises';

    -- 4. Unauthenticated raises.
    PERFORM set_config('request.jwt.claims', '{}', true);
    v_raised := false;
    BEGIN
      PERFORM public.try_consume_feature_usage('monthly_llm_requests');
    EXCEPTION WHEN others THEN
      v_raised := true;
      IF SQLERRM NOT LIKE 'not authenticated%' THEN
        RAISE EXCEPTION 'FAIL 4: wrong error when unauthenticated: %', SQLERRM;
      END IF;
    END;
    IF NOT v_raised THEN
      RAISE EXCEPTION 'FAIL 4: unauthenticated call accepted';
    END IF;
    RAISE NOTICE 'PASS 4: unauthenticated raises';

    RAISE NOTICE 'All assertions passed.';
  EXCEPTION WHEN others THEN
    DELETE FROM public.feature_usage WHERE user_id = v_user_id;
    INSERT INTO public.feature_usage SELECT * FROM _fu_snap;
    RAISE;
  END;

  DELETE FROM public.feature_usage WHERE user_id = v_user_id;
  INSERT INTO public.feature_usage SELECT * FROM _fu_snap;
END $$;
