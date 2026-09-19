-- Drop session episodes. Do not copy into Constraint profile or Training profile.
-- Hidden LLM summaries are not Agentic memory (ADR 0027).
DROP TABLE public.session_episodes;
