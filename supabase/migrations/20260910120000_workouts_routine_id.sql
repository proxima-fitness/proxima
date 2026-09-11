-- Day complete SoT: persist Hevy routine_id on workout backup (ADR 0011 / 0013 A7).
-- A planned day is complete iff this ID is in that week's Program–Hevy link hevy_routine_ids.

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS routine_id text NULL;

COMMENT ON COLUMN public.workouts.routine_id IS
  'Hevy routine ID this Workout was logged from. NULL for ad-hoc sessions. Day complete matches this ID against the week''s hevy_routine_ids.';

CREATE INDEX workouts_user_id_routine_id_idx
  ON public.workouts (user_id, routine_id)
  WHERE routine_id IS NOT NULL;
