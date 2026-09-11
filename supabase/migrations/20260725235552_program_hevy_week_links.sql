-- Program–Hevy link: durable pointer from Proxima program + week → Hevy folder + routines.
-- Grain: one row per (program_id, nth_week). Current week = max(nth_week) for a program.

CREATE TABLE public.program_hevy_week_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  program_id integer NOT NULL REFERENCES public.programs (id) ON UPDATE CASCADE ON DELETE CASCADE,
  nth_week smallint NOT NULL,
  hevy_folder_id bigint NOT NULL,
  hevy_routine_ids text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_hevy_week_links_program_nth_week_key
    UNIQUE (program_id, nth_week),
  CONSTRAINT program_hevy_week_links_nth_week_positive
    CHECK (nth_week > 0)
);

COMMENT ON TABLE public.program_hevy_week_links IS
  'Program–Hevy link: Hevy folder + routine IDs for one exported week of a Proxima program.';
COMMENT ON COLUMN public.program_hevy_week_links.nth_week IS
  '1-based week number within the Proxima program (same grain as schedule_workouts.nthWeek).';
COMMENT ON COLUMN public.program_hevy_week_links.hevy_folder_id IS
  'Hevy routine folder ID created by Week Export for this week.';
COMMENT ON COLUMN public.program_hevy_week_links.hevy_routine_ids IS
  'Hevy routine IDs (UUID strings) posted into the week folder, ordered by day.';

CREATE INDEX program_hevy_week_links_user_program_nth_week_idx
  ON public.program_hevy_week_links (user_id, program_id, nth_week DESC);

ALTER TABLE public.program_hevy_week_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own program hevy week links"
  ON public.program_hevy_week_links FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own program hevy week links"
  ON public.program_hevy_week_links FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own program hevy week links"
  ON public.program_hevy_week_links FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own program hevy week links"
  ON public.program_hevy_week_links FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.program_hevy_week_links
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_metadata();
