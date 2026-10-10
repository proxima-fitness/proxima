-- Workout history sync: missing parent → workout_exercises RLS (not FK).
-- Reproduces the concurrent-import race: importer A inserts a workouts shell,
-- importer B deletes that incomplete shell, A's workout_exercises INSERT fails
-- WITH CHECK because EXISTS on workouts sees no owned row. Postgres reports
-- RLS before the FK would fire.
--
-- Scratch script, not a migration. Leaves no rows (transaction rolled back).
--
--   npm run test:db-smoke
--
-- Or:
--   docker exec -i supabase_db_proxima_landing psql -U postgres -v ON_ERROR_STOP=1 -f - \
--     < supabase/snippets/verify_workout_exercises_rls_race.sql

BEGIN;

DO $$
DECLARE
  v_user uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_workout uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_ex uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_canon uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  v_err text;
  v_sqlstate text;
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (v_user, 'smoke-we-rls-race@example.com', 'smoke_we_rls_race')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.canonical_exercises (id, title, normalized_title, user_id)
  VALUES (v_canon, 'Smoke Race Bench', 'smoke race bench we rls', NULL)
  ON CONFLICT (id) DO NOTHING;

  -- Importer A: parent shell committed
  INSERT INTO public.workouts (
    id, user_id, source, external_id, title, started_at, ended_at
  ) VALUES (
    v_workout, v_user, 'hevy', 'smoke-ext-we-rls-race', 'Smoke Race Workout',
    now() - interval '1 hour', now()
  );

  -- Importer B: treats incomplete shell as stranded and deletes it
  DELETE FROM public.workouts WHERE id = v_workout;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  BEGIN
    INSERT INTO public.workout_exercises (
      id, workout_id, canonical_exercise_id, sort_order, source_exercise_id
    ) VALUES (
      v_ex, v_workout, v_canon, 0, 'tmpl-smoke'
    );
    RAISE EXCEPTION 'FAIL 1: expected RLS reject when parent workout is gone';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT, v_sqlstate = RETURNED_SQLSTATE;
      IF v_sqlstate <> '42501' OR v_err NOT ILIKE '%row-level security%workout_exercises%' THEN
        RAISE EXCEPTION 'FAIL 1: expected workout_exercises RLS 42501, got % / %',
          v_sqlstate, v_err;
      END IF;
      RAISE NOTICE 'PASS 1: missing parent surfaces as workout_exercises RLS (%)', v_err;
  END;

  -- Happy path still works when the parent exists
  RESET ROLE;
  INSERT INTO public.workouts (
    id, user_id, source, external_id, title, started_at, ended_at
  ) VALUES (
    v_workout, v_user, 'hevy', 'smoke-ext-we-rls-race-ok', 'Smoke Race Workout OK',
    now() - interval '1 hour', now()
  );

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user::text, 'role', 'authenticated')::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';

  INSERT INTO public.workout_exercises (
    id, workout_id, canonical_exercise_id, sort_order, source_exercise_id
  ) VALUES (
    v_ex, v_workout, v_canon, 0, 'tmpl-smoke'
  );
  RAISE NOTICE 'PASS 2: owned parent allows workout_exercises insert';

  RAISE NOTICE 'All workout_exercises RLS race smoke assertions passed.';
END $$;

ROLLBACK;
