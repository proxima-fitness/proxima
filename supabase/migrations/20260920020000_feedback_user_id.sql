-- Stamp signed-in feedback with user_id; unsigned rows stay null.
-- Anyone (anon + authenticated) can still insert. Clients never read this table.

ALTER TABLE public.feedback
  ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES public.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.feedback.user_id IS
  'Null when submitted anonymously (or pre-migration). Set to auth.uid() for signed-in submits.';

CREATE INDEX feedback_user_id_idx ON public.feedback (user_id);

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.feedback;

CREATE POLICY "Anyone can submit feedback"
  ON public.feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (feedback IS NOT NULL)
    AND (length(TRIM(BOTH FROM feedback)) > 0)
    AND (user_id IS NOT DISTINCT FROM auth.uid())
  );
