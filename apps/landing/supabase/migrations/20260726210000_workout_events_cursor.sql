-- Delta cursor for Hevy's workout events feed (ADR 0012 dogfood follow-up).
--
-- The backup mirror was count-driven: it only pulled when Hevy's total exceeded
-- what was backed up. Edits (same id, new sets/timestamps) and deletions never
-- move that total, so the mirror silently drifted from Hevy — stale sessions
-- kept counting, deleted ones were never removed.
--
-- `GET /v1/workouts/events?since=` reports created/updated and deleted workouts
-- explicitly. This column stores how far that feed has been consumed; it only
-- advances after a complete pass, so a partial or rate-limited run re-reads
-- rather than skips (applying an event twice is idempotent).

ALTER TABLE public.hevy_workouts_count
  ADD COLUMN IF NOT EXISTS last_workout_events_at timestamptz;

COMMENT ON COLUMN public.hevy_workouts_count.last_workout_events_at IS
  'High-water mark for GET /v1/workouts/events; null until the first complete pass.';
