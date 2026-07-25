-- Verifies the Usage period semantics introduced by
-- 20260725130000_feature_usage_monthly_periods.sql (ADR 0017).
--
-- Scratch script, not a migration: run it by hand after applying the migration.
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -f supabase/snippets/verify_feature_usage_periods.sql
--
-- Runs as postgres (RLS bypassed) and rolls back, so it leaves no rows behind.
-- Prints PASS/FAIL per assertion; raises on the first failure.

BEGIN;

DO $$
DECLARE
  v_user_id uuid;
  v_current date := (date_trunc('month', now() AT TIME ZONE 'utc'))::date;
  v_prior date := (date_trunc('month', now() AT TIME ZONE 'utc') - INTERVAL '1 month')::date;
  v_used integer;
  v_resets date;
  v_period date;
  v_rows integer;
  v_raised boolean;
BEGIN
  SELECT id INTO v_user_id FROM public.users ORDER BY created_at LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'no public.users row to test with';
  END IF;

  -- Both RPCs read auth.uid().
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', v_user_id, 'role', 'authenticated')::text,
                     true);

  DELETE FROM public.feature_usage WHERE user_id = v_user_id;

  -- 1. The read ignores prior-period rows and names the reset date.
  INSERT INTO public.feature_usage (user_id, period_start, monthly_exports_used, monthly_llm_requests)
  VALUES (v_user_id, v_prior, 7, 900);

  SELECT monthly_llm_requests_used, period_start, resets_on
    INTO v_used, v_period, v_resets
  FROM public.get_my_feature_limits();

  IF v_used <> 0 THEN
    RAISE EXCEPTION 'FAIL 1: read counted the prior period (% used)', v_used;
  END IF;
  IF v_period <> v_current THEN
    RAISE EXCEPTION 'FAIL 1: period_start = %, expected %', v_period, v_current;
  END IF;
  IF v_resets <> (v_current + INTERVAL '1 month')::date THEN
    RAISE EXCEPTION 'FAIL 1: resets_on = %, expected %', v_resets, (v_current + INTERVAL '1 month')::date;
  END IF;
  RAISE NOTICE 'PASS 1: prior-period row ignored; period % resets %', v_period, v_resets;

  -- 2. First increment of a fresh month creates that month's row.
  PERFORM public.increment_feature_usage('monthly_llm_requests');

  SELECT count(*) INTO v_rows
  FROM public.feature_usage
  WHERE user_id = v_user_id AND period_start = v_current;

  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'FAIL 2: % current-period rows, expected 1', v_rows;
  END IF;

  SELECT monthly_llm_requests_used INTO v_used FROM public.get_my_feature_limits();
  IF v_used <> 1 THEN
    RAISE EXCEPTION 'FAIL 2: read % after first increment, expected 1', v_used;
  END IF;
  RAISE NOTICE 'PASS 2: first increment created the current-period row';

  -- 3. Second increment in the same month adds to the existing row.
  PERFORM public.increment_feature_usage('monthly_llm_requests');
  PERFORM public.increment_feature_usage('monthly_exports_used');

  SELECT count(*) INTO v_rows
  FROM public.feature_usage
  WHERE user_id = v_user_id AND period_start = v_current;

  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'FAIL 3: % current-period rows after second increment, expected 1', v_rows;
  END IF;

  SELECT monthly_llm_requests_used, monthly_exports_used
    INTO v_used, v_rows
  FROM public.get_my_feature_limits();

  IF v_used <> 2 OR v_rows <> 1 THEN
    RAISE EXCEPTION 'FAIL 3: llm=% exports=%, expected 2 and 1', v_used, v_rows;
  END IF;

  -- The prior-period row is untouched by either increment.
  SELECT monthly_llm_requests INTO v_used
  FROM public.feature_usage
  WHERE user_id = v_user_id AND period_start = v_prior;

  IF v_used <> 900 THEN
    RAISE EXCEPTION 'FAIL 3: prior-period row mutated (llm = %)', v_used;
  END IF;
  RAISE NOTICE 'PASS 3: same-month increments accumulate on one row; prior period untouched';

  -- 4. Unknown meters are rejected rather than silently counted as zero.
  v_raised := false;
  BEGIN
    PERFORM public.increment_feature_usage('not_a_real_meter');
  EXCEPTION WHEN others THEN
    v_raised := true;
    IF SQLERRM NOT LIKE 'unknown meter%' THEN
      RAISE EXCEPTION 'FAIL 4: wrong error for unknown meter: %', SQLERRM;
    END IF;
  END;
  IF NOT v_raised THEN
    RAISE EXCEPTION 'FAIL 4: unknown meter accepted';
  END IF;
  RAISE NOTICE 'PASS 4: unknown meter raises';

  -- 5. period_start cannot be mid-month.
  v_raised := false;
  BEGIN
    INSERT INTO public.feature_usage (user_id, period_start)
    VALUES (v_user_id, v_current + 15);
  EXCEPTION WHEN check_violation THEN
    v_raised := true;
  END;
  IF NOT v_raised THEN
    RAISE EXCEPTION 'FAIL 5: mid-month period_start accepted';
  END IF;
  RAISE NOTICE 'PASS 5: mid-month period_start rejected';

  RAISE NOTICE 'All assertions passed (rolling back).';
END $$;

ROLLBACK;
