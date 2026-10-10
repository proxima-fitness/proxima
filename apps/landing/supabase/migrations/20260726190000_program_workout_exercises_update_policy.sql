-- Owner-scoped UPDATE on Program prescription exercises (ADR 0012 / 03).
--
-- The baseline shipped SELECT + INSERT policies for this table and nothing
-- else, because programs were only ever written whole on create. AI week
-- suggest Apply is the first path that updates an existing prescription row,
-- and RLS filters an UPDATE with no matching policy *silently*: zero rows
-- changed, no error. Apply reported success while the prescription kept its
-- old weights.
--
-- Ownership is one hop away (exercise → schedule_workouts → programs.user_id),
-- so the policy walks that chain rather than trusting the caller's program id.

CREATE POLICY "Users can update own program workout exercises"
  ON public.program_workout_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.schedule_workouts sw
      JOIN public.programs p ON p.id = sw.program_id
      WHERE sw.id = program_workout_exercises.schedule_id
        AND p.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.schedule_workouts sw
      JOIN public.programs p ON p.id = sw.program_id
      WHERE sw.id = program_workout_exercises.schedule_id
        AND p.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON TABLE public.program_workout_exercises IS
  'Program prescription exercises (per-set arrays). Owners may update their own rows; AI week suggest Apply writes week N+1 through this policy (ADR 0012).';
