-- ADR 0013 / SP5: Export-time Hevy routine IDs on Program–Hevy link.
-- Join key for Planned vs completed. Distinct from live hevy_routine_ids (Sync).
-- Backfill copies live IDs; already-diverged weeks are a known gap.

ALTER TABLE public.program_hevy_week_links
  ADD COLUMN IF NOT EXISTS exported_hevy_routine_ids text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.program_hevy_week_links.exported_hevy_routine_ids IS
  'Hevy routine IDs assigned to each Program prescription day at Week Export / Re-Export, in plan order. Planned vs completed join. Sync does not rewrite this list.';

UPDATE public.program_hevy_week_links
SET exported_hevy_routine_ids = hevy_routine_ids
WHERE exported_hevy_routine_ids = '{}'::text[]
  AND hevy_routine_ids <> '{}'::text[];
