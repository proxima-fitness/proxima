-- Body measurements backup: dated Hevy (and future source) measurement history.
-- Grain: one row per user + source + external_id (Hevy: external_id = measured_on date).

CREATE TABLE public.body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  source public.source_type NOT NULL DEFAULT 'hevy',
  external_id text NOT NULL,
  measured_on date NOT NULL,
  weight_kg numeric,
  lean_mass_kg numeric,
  fat_percent numeric,
  neck_cm numeric,
  shoulder_cm numeric,
  chest_cm numeric,
  left_bicep_cm numeric,
  right_bicep_cm numeric,
  left_forearm_cm numeric,
  right_forearm_cm numeric,
  abdomen numeric,
  waist numeric,
  hips numeric,
  left_thigh numeric,
  right_thigh numeric,
  left_calf numeric,
  right_calf numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT body_measurements_user_source_external_id_key
    UNIQUE (user_id, source, external_id),
  CONSTRAINT body_measurements_weight_positive
    CHECK (weight_kg IS NULL OR weight_kg > 0),
  CONSTRAINT body_measurements_lean_mass_positive
    CHECK (lean_mass_kg IS NULL OR lean_mass_kg > 0),
  CONSTRAINT body_measurements_fat_percent_range
    CHECK (fat_percent IS NULL OR (fat_percent >= 0 AND fat_percent <= 100))
);

COMMENT ON TABLE public.body_measurements IS
  'Backed-up body measurement entries synced from connected fitness apps (Hevy).';
COMMENT ON COLUMN public.body_measurements.external_id IS
  'Source identity for dedupe. For Hevy this is the measurement date (YYYY-MM-DD).';
COMMENT ON COLUMN public.body_measurements.measured_on IS
  'Calendar date of the measurement entry (canonical grain with user + source).';

CREATE INDEX body_measurements_user_measured_on_idx
  ON public.body_measurements (user_id, measured_on DESC);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own body measurements"
  ON public.body_measurements FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own body measurements"
  ON public.body_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own body measurements"
  ON public.body_measurements FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own body measurements"
  ON public.body_measurements FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.body_measurements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_metadata();
