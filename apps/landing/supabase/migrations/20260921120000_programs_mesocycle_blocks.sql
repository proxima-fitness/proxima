-- ADR 0032 / 04 (C5): persist First-build Mesocycle blocks on the Proxima program.
-- Shape: [{ "name": string, "weeks": number[] (1-based), "intent": string }], the
-- `blocks` array from the successful buildProgram call. Null when the program
-- was not a First build (manual, Hevy share, pre-migration). Written once on
-- New-path Save; Edit path / length changes do not rewrite it (may go stale).
-- RLS unchanged: existing programs policies cover the new column.

ALTER TABLE public.programs
  ADD COLUMN mesocycle_blocks jsonb;

ALTER TABLE public.programs
  ADD CONSTRAINT programs_mesocycle_blocks_is_array
  CHECK (mesocycle_blocks IS NULL OR jsonb_typeof(mesocycle_blocks) = 'array');

COMMENT ON COLUMN public.programs.mesocycle_blocks IS
  'First-build Mesocycle blocks [{name, weeks[], intent}] (ADR 0032). Claimed phases, not the Periodization wave.';
