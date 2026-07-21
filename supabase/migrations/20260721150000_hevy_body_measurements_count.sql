-- Sync cursor for Hevy body-measurements backup (workout-history twin).
-- Hevy has no /body_measurements/count; progress uses page walks + backed-up row counts.

CREATE TABLE public.hevy_body_measurements_count (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid UNIQUE REFERENCES public.users (id),
  updated_at timestamptz DEFAULT now(),
  last_known_measurement_count integer,
  last_synced_page integer,
  last_known_page_count integer,
  sync_error text
);

COMMENT ON TABLE public.hevy_body_measurements_count IS
  'Tracks Hevy body-measurements backup cursor: page walk + last known counts for delta catch-up.';
COMMENT ON COLUMN public.hevy_body_measurements_count.last_known_measurement_count IS
  'Backed-up Hevy body_measurements row count after a completed sync walk.';
COMMENT ON COLUMN public.hevy_body_measurements_count.last_synced_page IS
  'Last Hevy body_measurements list page processed during backfill (1-based). Null when idle/complete.';
COMMENT ON COLUMN public.hevy_body_measurements_count.last_known_page_count IS
  'Hevy page_count observed when last walk completed; used with row count for delta detection.';
COMMENT ON COLUMN public.hevy_body_measurements_count.sync_error IS
  'Set when body-measurements sync fails mid-backfill; cleared after a successful retry. NULL while syncing or idle.';

ALTER TABLE public.hevy_body_measurements_count ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for users own body measurement count"
  ON public.hevy_body_measurements_count FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.hevy_body_measurements_count FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow user to update own body measurement count"
  ON public.hevy_body_measurements_count FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
