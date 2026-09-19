-- Drop chat refinements. Do not copy into injuries.
-- Stored values were mostly program-style leftover. Health that still matters
-- is already on injuries, or Andy will write it via addInjuries on the next chat
-- (ADR 0025 slice 1a).
ALTER TABLE public.user_constraints
  DROP COLUMN chat_refinements;
