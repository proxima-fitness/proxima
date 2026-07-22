CREATE TABLE public.user_constraints (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  injuries jsonb NOT NULL DEFAULT '[]'::jsonb,
  excluded_equipment jsonb NOT NULL DEFAULT '[]'::jsonb,
  excluded_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  chat_refinements jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_statements jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_constraints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own constraints"
  ON public.user_constraints FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own constraints"
  ON public.user_constraints FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own constraints"
  ON public.user_constraints FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_constraints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_metadata();

CREATE OR REPLACE FUNCTION public.append_raw_statement(
  p_user_id uuid,
  p_statement text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_constraints
  SET raw_statements = raw_statements || jsonb_build_array(p_statement)
  WHERE user_id = p_user_id;
$$;
