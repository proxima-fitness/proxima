-- ADR 0008 / Sub-plan 4 — local Postgres + RLS smoke for program_hevy_week_links.
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
  v_raised boolean;
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

  RAISE NOTICE 'All program_hevy_week_links smoke assertions passed.';
END $$;

ROLLBACK;
