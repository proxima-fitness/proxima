CREATE TABLE public.session_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  chat_id text,
  program_id integer,
  summary text NOT NULL,
  key_decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  constraints_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_episodes_user_program_idx
  ON public.session_episodes (user_id, program_id, created_at DESC);

ALTER TABLE public.session_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own episodes"
  ON public.session_episodes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own episodes"
  ON public.session_episodes FOR INSERT WITH CHECK (auth.uid() = user_id);
