-- Expand source_type with the closed Public API Workout source list.
-- hevy stays for native sync. Unique (user_id, source, external_id) is unchanged (ADR 0026 / 01).

ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'manual';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'strong';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'macrofactor_workouts';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'fitbod';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'gravl';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'apple_health';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'jefit';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'caliber';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'boostcamp';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'liftosaur';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'strengthlog';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'alpha_progression';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'stronglifts';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'setgraph';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'rp_hypertrophy';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'juggernaut';

COMMENT ON TYPE public.source_type IS
  'Workout source. hevy is native sync; other slugs are the closed Public API list (ADR 0026).';

COMMENT ON COLUMN public.workouts.source IS
  'Workout source: hevy (native sync) or a Public API slug.';
