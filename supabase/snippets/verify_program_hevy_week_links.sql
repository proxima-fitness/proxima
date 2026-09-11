-- ADR 0008 / Sub-plan 4 — local Postgres + RLS smoke for program_hevy_week_links.
-- PASS 7–10: ADR 0011 `completed_at` (Week complete) under RLS. PRO-256.
-- PASS 11–13: ADR 0013 `exported_hevy_routine_ids` (Export-time Hevy routine IDs).
--
-- Scratch script, not a migration. Leaves no rows (transaction rolled back).
--
-- Run (Docker local stack; host may not have psql):
--   docker exec -i supabase_db_proxima_landing psql -U postgres -v ON_ERROR_STOP=1 -f - \
--     < supabase/snippets/verify_program_hevy_week_links.sql
--
-- Or with local psql:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 \
--     -f supabase/snippets/verify_program_hevy_week_links.sql
--
-- Setup runs as postgres; RLS checks use SET LOCAL ROLE authenticated +
-- request.jwt.claims → auth.uid(). Fixture ids live in session GUC so the
-- authenticated role can read them. Prints PASS/FAIL; raises on first fail.

BEGIN;

-- Fixtures (postgres bypasses RLS on users/programs)
DO $$
DECLARE
  v_user_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_user_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_program_id integer;
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES
    (v_user_a, 'smoke-hevy-link-a@example.com', 'smoke_hevy_link_a'),
    (v_user_b, 'smoke-hevy-link-b@example.com', 'smoke_hevy_link_b');

  INSERT INTO public.programs (title, user_id, program_length)
  VALUES ('smoke-program-hevy-link', v_user_a, 4)
  RETURNING id INTO v_program_id;

  PERFORM set_config('app.phwl_user_a', v_user_a::text, true);
  PERFORM set_config('app.phwl_user_b', v_user_b::text, true);
  PERFORM set_config('app.phwl_program_id', v_program_id::text, true);
END $$;

-- Non-superuser so RLS applies (postgres always bypasses)
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('app.phwl_user_a'),
    'role', 'authenticated'
  )::text,
  true
);

DO $$
DECLARE
  v_user_a uuid := current_setting('app.phwl_user_a')::uuid;
  v_program_id integer := current_setting('app.phwl_program_id')::integer;
  v_max_week smallint;
  v_n integer;
  v_folder bigint;
  v_routines text[];
  v_exported text[];
  v_raised boolean;
  v_completed timestamptz;
BEGIN
  -- 1. Insert week 1 → success
  INSERT INTO public.program_hevy_week_links (
    user_id, program_id, nth_week, hevy_folder_id, hevy_routine_ids
  ) VALUES (
    v_user_a, v_program_id, 1, 1001, ARRAY['routine-w1-a', 'routine-w1-b']
  );
  RAISE NOTICE 'PASS 1: user A insert week 1 for program %', v_program_id;

  -- 2. Second insert same (program, week) → unique violation
  v_raised := false;
  BEGIN
    INSERT INTO public.program_hevy_week_links (
      user_id, program_id, nth_week, hevy_folder_id, hevy_routine_ids
    ) VALUES (
      v_user_a, v_program_id, 1, 1999, ARRAY['dup']
    );
  EXCEPTION WHEN unique_violation THEN
    v_raised := true;
  END;
  IF NOT v_raised THEN
    RAISE EXCEPTION 'FAIL 2: duplicate (program_id, nth_week) accepted';
  END IF;
  RAISE NOTICE 'PASS 2: unique (program_id, nth_week) rejects second insert';

  -- 3. Insert week 2 → max nth_week = 2 (current week)
  INSERT INTO public.program_hevy_week_links (
    user_id, program_id, nth_week, hevy_folder_id, hevy_routine_ids
  ) VALUES (
    v_user_a, v_program_id, 2, 2002, ARRAY['routine-w2-a']
  );

  SELECT max(nth_week) INTO v_max_week
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id;

  IF v_max_week IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'FAIL 3: max nth_week = %, expected 2', v_max_week;
  END IF;
  RAISE NOTICE 'PASS 3: after weeks 1+2, max nth_week = 2';

  -- 4. Upsert week 2 with new IDs → one row; ids updated
  INSERT INTO public.program_hevy_week_links (
    user_id, program_id, nth_week, hevy_folder_id, hevy_routine_ids
  ) VALUES (
    v_user_a, v_program_id, 2, 2222, ARRAY['routine-w2-new']
  )
  ON CONFLICT (program_id, nth_week) DO UPDATE
  SET
    hevy_folder_id = EXCLUDED.hevy_folder_id,
    hevy_routine_ids = EXCLUDED.hevy_routine_ids;

  SELECT count(*) INTO v_n
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id AND nth_week = 2;

  SELECT hevy_folder_id, hevy_routine_ids
    INTO v_folder, v_routines
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id AND nth_week = 2;

  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FAIL 4: % week-2 rows after upsert, expected 1', v_n;
  END IF;
  IF v_folder IS DISTINCT FROM 2222 THEN
    RAISE EXCEPTION 'FAIL 4: hevy_folder_id = %, expected 2222', v_folder;
  END IF;
  IF v_routines IS DISTINCT FROM ARRAY['routine-w2-new']::text[] THEN
    RAISE EXCEPTION 'FAIL 4: hevy_routine_ids = %, expected {routine-w2-new}', v_routines;
  END IF;
  RAISE NOTICE 'PASS 4: upsert week 2 updates IDs in place (one row)';

  -- 7. Week 1 still incomplete after insert / week-2 upsert
  SELECT completed_at INTO v_completed
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id AND nth_week = 1;

  IF v_completed IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 7: week 1 completed_at = %, expected NULL', v_completed;
  END IF;
  RAISE NOTICE 'PASS 7: insert leaves completed_at NULL';

  -- 8. Owner sets Week complete — one row; folder / routine ids unchanged
  UPDATE public.program_hevy_week_links
  SET completed_at = clock_timestamp()
  WHERE program_id = v_program_id AND nth_week = 1;

  SELECT count(*) INTO v_n
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id AND nth_week = 1;

  SELECT completed_at, hevy_folder_id, hevy_routine_ids
    INTO v_completed, v_folder, v_routines
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id AND nth_week = 1;

  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FAIL 8: % week-1 rows after complete, expected 1', v_n;
  END IF;
  IF v_completed IS NULL THEN
    RAISE EXCEPTION 'FAIL 8: completed_at still NULL after owner UPDATE';
  END IF;
  IF v_folder IS DISTINCT FROM 1001 THEN
    RAISE EXCEPTION 'FAIL 8: hevy_folder_id = %, expected 1001', v_folder;
  END IF;
  IF v_routines IS DISTINCT FROM ARRAY['routine-w1-a', 'routine-w1-b']::text[] THEN
    RAISE EXCEPTION 'FAIL 8: hevy_routine_ids changed on complete';
  END IF;
  RAISE NOTICE 'PASS 8: owner UPDATE sets completed_at; ids unchanged';

  -- 9. Second owner UPDATE — still one row; completed_at stays non-null
  --    (timestamp may change; matches markProgramWeekComplete)
  UPDATE public.program_hevy_week_links
  SET completed_at = clock_timestamp()
  WHERE program_id = v_program_id AND nth_week = 1;

  SELECT count(*) INTO v_n
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id AND nth_week = 1;

  SELECT completed_at INTO v_completed
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id AND nth_week = 1;

  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FAIL 9: % week-1 rows after second complete, expected 1', v_n;
  END IF;
  IF v_completed IS NULL THEN
    RAISE EXCEPTION 'FAIL 9: completed_at NULL after second owner UPDATE';
  END IF;
  RAISE NOTICE 'PASS 9: second owner UPDATE keeps one row and completed_at set';

  -- 11. Insert that omits freeze column → default empty array
  SELECT exported_hevy_routine_ids INTO v_exported
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id AND nth_week = 1;

  IF v_exported IS DISTINCT FROM '{}'::text[] THEN
    RAISE EXCEPTION 'FAIL 11: exported_hevy_routine_ids = %, expected {}', v_exported;
  END IF;
  RAISE NOTICE 'PASS 11: insert default exported_hevy_routine_ids is empty';

  -- 12. Freeze set; live-ID UPDATE does not rewrite Export-time IDs (Sync)
  UPDATE public.program_hevy_week_links
  SET exported_hevy_routine_ids = hevy_routine_ids
  WHERE program_id = v_program_id AND nth_week = 1;

  UPDATE public.program_hevy_week_links
  SET hevy_routine_ids = ARRAY['live-only']
  WHERE program_id = v_program_id AND nth_week = 1;

  SELECT hevy_routine_ids, exported_hevy_routine_ids
    INTO v_routines, v_exported
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id AND nth_week = 1;

  IF v_routines IS DISTINCT FROM ARRAY['live-only']::text[] THEN
    RAISE EXCEPTION 'FAIL 12: hevy_routine_ids = %, expected {live-only}', v_routines;
  END IF;
  IF v_exported IS DISTINCT FROM ARRAY['routine-w1-a', 'routine-w1-b']::text[] THEN
    RAISE EXCEPTION 'FAIL 12: exported_hevy_routine_ids = %, expected week-1 export IDs', v_exported;
  END IF;
  RAISE NOTICE 'PASS 12: live-ID UPDATE leaves Export-time Hevy routine IDs unchanged';

  -- 13. Upsert writes both arrays (Week Export / Re-Export)
  INSERT INTO public.program_hevy_week_links (
    user_id, program_id, nth_week, hevy_folder_id, hevy_routine_ids, exported_hevy_routine_ids
  ) VALUES (
    v_user_a, v_program_id, 2, 2222, ARRAY['export-w2-a'], ARRAY['export-w2-a']
  )
  ON CONFLICT (program_id, nth_week) DO UPDATE
  SET
    hevy_folder_id = EXCLUDED.hevy_folder_id,
    hevy_routine_ids = EXCLUDED.hevy_routine_ids,
    exported_hevy_routine_ids = EXCLUDED.exported_hevy_routine_ids;

  SELECT hevy_routine_ids, exported_hevy_routine_ids
    INTO v_routines, v_exported
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id AND nth_week = 2;

  IF v_routines IS DISTINCT FROM ARRAY['export-w2-a']::text[] THEN
    RAISE EXCEPTION 'FAIL 13: hevy_routine_ids = %, expected {export-w2-a}', v_routines;
  END IF;
  IF v_exported IS DISTINCT FROM ARRAY['export-w2-a']::text[] THEN
    RAISE EXCEPTION 'FAIL 13: exported_hevy_routine_ids = %, expected {export-w2-a}', v_exported;
  END IF;
  RAISE NOTICE 'PASS 13: upsert writes live and Export-time Hevy routine IDs';
END $$;

-- Act as user B
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('app.phwl_user_b'),
    'role', 'authenticated'
  )::text,
  true
);

DO $$
DECLARE
  v_user_a uuid := current_setting('app.phwl_user_a')::uuid;
  v_program_id integer := current_setting('app.phwl_program_id')::integer;
  v_n integer;
  v_raised boolean;
BEGIN
  -- 5. Cannot read A's links
  SELECT count(*) INTO v_n
  FROM public.program_hevy_week_links
  WHERE program_id = v_program_id;

  IF v_n <> 0 THEN
    RAISE EXCEPTION 'FAIL 5: user B saw % of A''s link rows', v_n;
  END IF;
  RAISE NOTICE 'PASS 5: user B SELECT of A''s program links returns 0 rows';

  -- 6. INSERT as A → RLS reject
  v_raised := false;
  BEGIN
    INSERT INTO public.program_hevy_week_links (
      user_id, program_id, nth_week, hevy_folder_id, hevy_routine_ids
    ) VALUES (
      v_user_a, v_program_id, 3, 3003, ARRAY['stolen']
    );
  EXCEPTION WHEN insufficient_privilege THEN
    v_raised := true;
  END;
  IF NOT v_raised THEN
    RAISE EXCEPTION 'FAIL 6: user B insert with user_id=A was accepted';
  END IF;
  RAISE NOTICE 'PASS 6: user B INSERT with user_id=A rejected by RLS';

  -- 10. Cannot set A's Week complete
  UPDATE public.program_hevy_week_links
  SET completed_at = clock_timestamp()
  WHERE program_id = v_program_id AND nth_week = 1;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  IF v_n <> 0 THEN
    RAISE EXCEPTION 'FAIL 10: user B UPDATE of A''s completed_at affected % row(s)', v_n;
  END IF;
  RAISE NOTICE 'PASS 10: user B UPDATE of A''s completed_at affects 0 rows';

  RAISE NOTICE 'All program_hevy_week_links smoke assertions passed.';
END $$;

ROLLBACK;
