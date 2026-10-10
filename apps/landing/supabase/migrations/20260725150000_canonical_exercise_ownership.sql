-- Custom movements: give canonical_exercises an explicit owner, scope uniqueness to that owner,
-- and unify the two normalization schemes that currently share one unique index.
-- ADR: docs/adr/0018-custom-movements/01-canonical-ownership-schema.md
--
-- Ordering is load-bearing: ownership is assigned before uniqueness is re-scoped, so rows that are
-- only duplicates under the old global constraint are absorbed by the scoped ones.

-- ── 1. Match-key helper ─────────────────────────────────────────────────
-- Lossy, order-insensitive form used to *suggest* merges and promotions. Never keys a constraint.

CREATE OR REPLACE FUNCTION public.exercise_match_key(p_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    (
      SELECT string_agg(token, ' ' ORDER BY token)
      FROM unnest(
        string_to_array(
          btrim(regexp_replace(replace(replace(lower(p_title), '(', ''), ')', ''), '\s+', ' ', 'g')),
          ' '
        )
      ) AS token
      WHERE token <> ''
    ),
    ''
  );
$$;

COMMENT ON FUNCTION public.exercise_match_key(text) IS
  'Token-sorted, parens-stripped, lowercased title. Fuzzy curation key only - never back a unique constraint with it.';

-- Derived in the database so the column cannot drift from the title, whatever a caller sends.
CREATE OR REPLACE FUNCTION public.set_exercise_match_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.match_key := public.exercise_match_key(NEW.title);
  RETURN NEW;
END;
$$;

-- ── 2. Columns and supplemental flag ────────────────────────────────────

ALTER TABLE public.canonical_exercises
  ADD COLUMN user_id uuid REFERENCES public.users (id) ON DELETE CASCADE,
  ADD COLUMN match_key text;

COMMENT ON COLUMN public.canonical_exercises.user_id IS
  'Null = Global canonical (Hevy library seed or Proxima supplemental). Set = Custom movement owned by that user.';
COMMENT ON COLUMN public.canonical_exercises.match_key IS
  'Token-sorted, parens-stripped form for suggesting merges and promotions. Non-unique by design; normalized_title is the identity key.';

CREATE TRIGGER set_match_key
  BEFORE INSERT OR UPDATE ON public.canonical_exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.set_exercise_match_key();

ALTER TABLE public.hevy_exercise_templates
  ADD COLUMN is_proxima_supplemental boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.hevy_exercise_templates.is_proxima_supplemental IS
  'True for Proxima supplemental templates (warmups and rehab movements Hevy does not publish).';

UPDATE public.hevy_exercise_templates
SET is_proxima_supplemental = true
WHERE id LIKE 'WU%';

-- ── 3. Backfill ownership ───────────────────────────────────────────────
-- A canonical row is a Custom movement when its mapping points at a template ID absent from the
-- mirror *and* exactly one user's workouts reference it. Rows referenced by several users stay
-- global and are reported below for review - most are Hevy library templates the mirror missed.
--
-- The ID-shape observations in the ADR classify this one-time backfill only. The runtime
-- discriminator is the resolver's mirror-then-API check (sub-plan 2).

CREATE TEMPORARY TABLE canonical_lazy_rows AS
SELECT ce.id
FROM public.canonical_exercises ce
JOIN public.canonical_exercise_mappings m ON m.canonical_exercise_id = ce.id
LEFT JOIN public.hevy_exercise_templates t ON t.id = m.external_exercise_id
WHERE m.source = 'hevy'
  AND t.id IS NULL;

CREATE TEMPORARY TABLE canonical_row_owners AS
SELECT we.canonical_exercise_id AS id,
       (array_agg(DISTINCT w.user_id))[1] AS user_id,
       count(DISTINCT w.user_id) AS user_count
FROM public.workout_exercises we
JOIN public.workouts w ON w.id = we.workout_id
WHERE we.canonical_exercise_id IN (SELECT id FROM canonical_lazy_rows)
GROUP BY we.canonical_exercise_id;

UPDATE public.canonical_exercises ce
SET user_id = o.user_id
FROM canonical_row_owners o
JOIN public.users u ON u.id = o.user_id
WHERE ce.id = o.id
  AND o.user_count = 1;

DO $$
DECLARE
  v_owned integer;
  v_review integer;
BEGIN
  SELECT count(*) FILTER (WHERE ce.user_id IS NOT NULL),
         count(*) FILTER (WHERE ce.user_id IS NULL)
    INTO v_owned, v_review
  FROM canonical_lazy_rows l
  JOIN public.canonical_exercises ce ON ce.id = l.id;

  RAISE NOTICE 'canonical ownership backfill: % rows owned, % left global for review', v_owned, v_review;

  IF v_review > 0 THEN
    RAISE NOTICE 'left global (id, referencing users): %', (
      SELECT string_agg(l.id::text || ' (' || coalesce(o.user_count, 0)::text || ')', ', ' ORDER BY l.id)
      FROM canonical_lazy_rows l
      JOIN public.canonical_exercises ce ON ce.id = l.id
      LEFT JOIN canonical_row_owners o ON o.id = l.id
      WHERE ce.user_id IS NULL
    );
  END IF;
END $$;

-- ── 4. Unify normalized_title on the identity key ───────────────────────
-- Lowercase, collapse whitespace, trim - word order and parentheses preserved. The old global
-- constraint has to go first: re-keying collides under it precisely where ownership now differs.

ALTER TABLE public.canonical_exercises
  DROP CONSTRAINT canonical_exercises_normalized_title_key;

UPDATE public.canonical_exercises
SET normalized_title = btrim(regexp_replace(lower(title), '\s+', ' ', 'g'))
WHERE normalized_title IS DISTINCT FROM btrim(regexp_replace(lower(title), '\s+', ' ', 'g'));

UPDATE public.canonical_exercises
SET match_key = public.exercise_match_key(title)
WHERE match_key IS DISTINCT FROM public.exercise_match_key(title);

-- ── 5. Resolve duplicate groups left inside one scope ───────────────────
-- Keep the older row, repoint referencing rows, then delete the loser. workout_exercises cascades
-- on delete of a canonical row, so repointing must happen first. canonical_exercise_mappings has no
-- FK, so it is repointed explicitly.

CREATE TEMPORARY TABLE canonical_duplicate_merges AS
SELECT id, keeper_id
FROM (
  SELECT id,
         first_value(id) OVER (
           PARTITION BY user_id, normalized_title
           ORDER BY created_at, id
         ) AS keeper_id
  FROM public.canonical_exercises
) ranked
WHERE id <> keeper_id;

UPDATE public.workout_exercises we
SET canonical_exercise_id = d.keeper_id
FROM canonical_duplicate_merges d
WHERE we.canonical_exercise_id = d.id;

UPDATE public.canonical_exercise_mappings m
SET canonical_exercise_id = d.keeper_id
FROM canonical_duplicate_merges d
WHERE m.canonical_exercise_id = d.id;

DELETE FROM public.canonical_exercises ce
USING canonical_duplicate_merges d
WHERE ce.id = d.id;

DO $$
DECLARE
  v_groups integer;
BEGIN
  SELECT count(*) INTO v_groups
  FROM (
    SELECT 1
    FROM public.canonical_exercises
    GROUP BY user_id, normalized_title
    HAVING count(*) > 1
  ) g;

  IF v_groups > 0 THEN
    RAISE EXCEPTION 'canonical_exercises still holds % duplicate (user_id, normalized_title) group(s); resolve before scoping uniqueness', v_groups;
  END IF;
END $$;

DROP TABLE canonical_duplicate_merges;
DROP TABLE canonical_row_owners;
DROP TABLE canonical_lazy_rows;

-- ── 6. Scoped uniqueness ────────────────────────────────────────────────
-- UNIQUE (user_id, normalized_title) does not constrain global rows, because null user_ids are
-- never equal to each other - hence the partial unique index for the global scope.

CREATE UNIQUE INDEX canonical_exercises_global_normalized_title_key
  ON public.canonical_exercises (normalized_title)
  WHERE user_id IS NULL;

ALTER TABLE public.canonical_exercises
  ADD CONSTRAINT canonical_exercises_user_id_normalized_title_key
  UNIQUE (user_id, normalized_title);

CREATE INDEX canonical_exercises_match_key_idx
  ON public.canonical_exercises (match_key);

-- ── 7. RLS ──────────────────────────────────────────────────────────────
-- The insert predicate matches the read predicate rather than pinning user_id to auth.uid():
-- /api/workout-history/sync runs on the user's JWT, not the service role, and the resolver still
-- has to create global rows when the mirror turns out to be stale (sub-plan 2). What the predicate
-- does block is a client minting a row owned by somebody else.

DROP POLICY "Anyone can read canonical exercises" ON public.canonical_exercises;

CREATE POLICY "Read global and own canonical exercises"
  ON public.canonical_exercises FOR SELECT
  USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

DROP POLICY "Authenticated can insert canonical exercises" ON public.canonical_exercises;

CREATE POLICY "Insert global or own canonical exercises"
  ON public.canonical_exercises FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));
