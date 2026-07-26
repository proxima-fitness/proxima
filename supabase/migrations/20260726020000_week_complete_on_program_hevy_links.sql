-- ADR 0011 / sub-plan 4: durable Week complete on Program–Hevy link.
-- Manual Mark week complete + auto-mark when all schedule-history days are done.

ALTER TABLE public.program_hevy_week_links
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

COMMENT ON COLUMN public.program_hevy_week_links.completed_at IS
  'When Week complete was set (manual button or auto from schedule history). NULL = incomplete. ADR 0011.';
