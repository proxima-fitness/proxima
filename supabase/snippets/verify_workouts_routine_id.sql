-- Day complete SoT: workouts.routine_id (ADR 0011 / 0013 A7).
-- Scratch script, not a migration. Leaves no rows (transaction rolled back).
--
--   npm run test:db-smoke
--
-- Prints PASS/FAIL; raises on first fail.

BEGIN;

DO $$
DECLARE
  v_user uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_workout uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_col text;
  v_idx text;
  v_n integer;
BEGIN
  SELECT column_name INTO v_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'workouts'
    AND column_name = 'routine_id';

  IF v_col IS NULL THEN
    RAISE EXCEPTION 'FAIL 1: workouts.routine_id column missing';
  END IF;
  RAISE NOTICE 'PASS 1: workouts.routine_id exists';

  SELECT indexname INTO v_idx
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'workouts'
    AND indexname = 'workouts_user_id_routine_id_idx';

  IF v_idx IS NULL THEN
    RAISE EXCEPTION 'FAIL 2: workouts_user_id_routine_id_idx missing';
  END IF;
  RAISE NOTICE 'PASS 2: partial index (user_id, routine_id) exists';

  INSERT INTO public.users (id, email, username)
  VALUES (v_user, 'smoke-workout-routine-id@example.com', 'smoke_workout_routine');

  INSERT INTO public.workouts (
    id, user_id, source, external_id, title, started_at, ended_at, routine_id
  ) VALUES (
    v_workout, v_user, 'hevy', 'ext-1', '1 - Push Day',
    now(), now() + interval '1 hour', 'hevy-routine-push'
  );

  SELECT count(*) INTO v_n
  FROM public.workouts
  WHERE user_id = v_user AND routine_id = 'hevy-routine-push';

  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FAIL 3: expected 1 row with routine_id, got %', v_n;
  END IF;
  RAISE NOTICE 'PASS 3: insert stores routine_id';

  RAISE NOTICE 'All workouts.routine_id smoke assertions passed.';
END $$;

ROLLBACK;
