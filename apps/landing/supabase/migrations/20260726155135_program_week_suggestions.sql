-- Cached AI week suggest result (ADR 0012). One row per program + completed week.
-- Company-borne LLM cost: generate once, return cache on later panel opens.

CREATE TABLE public.program_week_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  program_id integer NOT NULL REFERENCES public.programs (id) ON UPDATE CASCADE ON DELETE CASCADE,
  based_on_week smallint NOT NULL,
  target_week smallint NOT NULL,
  summary text NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_week_suggestions_program_based_on_week_key
    UNIQUE (program_id, based_on_week),
  CONSTRAINT program_week_suggestions_based_on_week_positive
    CHECK (based_on_week > 0),
  CONSTRAINT program_week_suggestions_target_after_based
    CHECK (target_week = based_on_week + 1)
);

COMMENT ON TABLE public.program_week_suggestions IS
  'Cached AI week suggest output for one completed week → next-week changes (ADR 0012).';
COMMENT ON COLUMN public.program_week_suggestions.based_on_week IS
  '1-based completed week the suggestion was generated from.';
COMMENT ON COLUMN public.program_week_suggestions.target_week IS
  '1-based week the changes target (always based_on_week + 1).';
COMMENT ON COLUMN public.program_week_suggestions.changes IS
  'JSON array of { description, operation } mutateProgram ops for week N+1.';

CREATE INDEX program_week_suggestions_user_program_idx
  ON public.program_week_suggestions (user_id, program_id, based_on_week DESC);

ALTER TABLE public.program_week_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own program week suggestions"
  ON public.program_week_suggestions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own program week suggestions"
  ON public.program_week_suggestions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own program week suggestions"
  ON public.program_week_suggestions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own program week suggestions"
  ON public.program_week_suggestions FOR DELETE
  USING ((SELECT auth.uid()) = user_id);
