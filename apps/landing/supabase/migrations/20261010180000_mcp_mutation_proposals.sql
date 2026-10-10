-- Durable MCP Mutation proposals (ADR 0034). Edge isolates do not share process memory.
CREATE TABLE public.mcp_mutation_proposals (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  program_id integer NOT NULL REFERENCES public.programs (id) ON DELETE CASCADE,
  operations jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, program_id)
);

ALTER TABLE public.mcp_mutation_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own mcp mutation proposals"
  ON public.mcp_mutation_proposals FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own mcp mutation proposals"
  ON public.mcp_mutation_proposals FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own mcp mutation proposals"
  ON public.mcp_mutation_proposals FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own mcp mutation proposals"
  ON public.mcp_mutation_proposals FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.mcp_mutation_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_metadata();
