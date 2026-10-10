-- ADR 0011 / sub-plan 3: on-demand hevy-program-sync (no midnight fan-out).
-- Separate program-sync cursor from workout-history backup cursor.

ALTER TABLE public.hevy_workouts_count
  ADD COLUMN IF NOT EXISTS last_hevy_program_sync_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.hevy_workouts_count.last_hevy_program_sync_count IS
  'Hevy /v1/workouts/count after last hevy-program-sync run. Distinct from last_known_workout_count (workout history backup). ADR 0011.';

-- Retire cron fan-out. Job may already be inactive in prod; unschedule if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'hevy_program_sync'
  ) THEN
    PERFORM cron.unschedule('hevy_program_sync');
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL; -- cron schema absent (e.g. some local setups)
  WHEN undefined_function THEN
    NULL;
END $$;

-- No-op the RPC so a revived schedule cannot fan out.
CREATE OR REPLACE FUNCTION public.trigger_all_users_hevy_program_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ADR 0011: retired. Invoke hevy-program-sync on demand from profile / Program overview.
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.trigger_all_users_hevy_program_sync() IS
  'Retired (ADR 0011). Was midnight/hourly fan-out; program sync is on-demand only.';
