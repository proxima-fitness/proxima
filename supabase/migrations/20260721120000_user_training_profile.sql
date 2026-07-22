CREATE TABLE public.user_training_profile (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  age integer,
  sex text,
  height_cm numeric,
  experience_level text,
  physique_phase text,
  training_focus text,
  activity_level text,
  session_duration_min integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_training_profile_age_range
    CHECK (age IS NULL OR (age >= 14 AND age <= 100)),
  CONSTRAINT user_training_profile_session_duration_range
    CHECK (
      session_duration_min IS NULL
      OR (
        session_duration_min >= 10
        AND session_duration_min <= 180
        AND session_duration_min % 10 = 0
      )
    ),
  CONSTRAINT user_training_profile_height_positive
    CHECK (height_cm IS NULL OR height_cm > 0)
);

ALTER TABLE public.user_training_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own training profile"
  ON public.user_training_profile FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own training profile"
  ON public.user_training_profile FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training profile"
  ON public.user_training_profile FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_training_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_metadata();
