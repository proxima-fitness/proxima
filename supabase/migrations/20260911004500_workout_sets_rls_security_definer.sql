-- Nested RLS on workout_sets WITH CHECK (exercise JOIN workout) can reject a
-- legitimate insert: PostgREST writes sets in a follow-up request after the
-- exercise row lands, and the join is itself RLS-filtered. A SECURITY DEFINER
-- helper reads parent ownership without that inner RLS, still gated on auth.uid().

CREATE OR REPLACE FUNCTION public.workout_set_parent_owned_by_uid(p_workout_exercise_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workout_exercises we
    JOIN public.workouts w ON w.id = we.workout_id
    WHERE we.id = p_workout_exercise_id
      AND w.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.workout_set_parent_owned_by_uid(uuid) IS
  'True when the workout_exercises row belongs to auth.uid(). Used by workout_sets RLS so INSERT WITH CHECK does not nest RLS on the parent join.';

REVOKE ALL ON FUNCTION public.workout_set_parent_owned_by_uid(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workout_set_parent_owned_by_uid(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users insert own workout sets" ON public.workout_sets;
CREATE POLICY "Users insert own workout sets"
  ON public.workout_sets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.workout_set_parent_owned_by_uid(workout_exercise_id));

DROP POLICY IF EXISTS "Users select own workout sets" ON public.workout_sets;
CREATE POLICY "Users select own workout sets"
  ON public.workout_sets
  FOR SELECT
  TO authenticated
  USING (public.workout_set_parent_owned_by_uid(workout_exercise_id));

DROP POLICY IF EXISTS "Users update own workout sets" ON public.workout_sets;
CREATE POLICY "Users update own workout sets"
  ON public.workout_sets
  FOR UPDATE
  TO authenticated
  USING (public.workout_set_parent_owned_by_uid(workout_exercise_id))
  WITH CHECK (public.workout_set_parent_owned_by_uid(workout_exercise_id));

DROP POLICY IF EXISTS "Users delete own workout sets" ON public.workout_sets;
CREATE POLICY "Users delete own workout sets"
  ON public.workout_sets
  FOR DELETE
  TO authenticated
  USING (public.workout_set_parent_owned_by_uid(workout_exercise_id));
