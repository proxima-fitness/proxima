-- ADR 0015 SP2: AI week suggest billing flag. Existing rows grandfather as
-- consumed (full payload) so live caches stay unlocked.

ALTER TABLE public.program_week_suggestions
  ADD COLUMN llm_consumed boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.program_week_suggestions.llm_consumed IS
  'True when this cache row already spent one monthly_llm_requests unit (or was grandfathered). False is a tease: full row on the server, truncated payload until remaining > 0.';
