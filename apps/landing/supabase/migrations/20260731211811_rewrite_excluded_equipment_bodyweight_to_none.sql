-- One-shot: legacy exclude token `bodyweight` never matched Hevy equipment.
-- Catalog now uses Bodyweight → value `none`. Rewrite stored arrays; drop dupes.
-- Applied on prod 2026-07-31; file restored so local history matches remote.
UPDATE public.user_constraints
SET excluded_equipment = (
  SELECT COALESCE(jsonb_agg(to_jsonb(v) ORDER BY v), '[]'::jsonb)
  FROM (
    SELECT DISTINCT
      CASE
        WHEN lower(x) = 'bodyweight' THEN 'none'
        ELSE x
      END AS v
    FROM jsonb_array_elements_text(excluded_equipment) AS t(x)
  ) d
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements_text(excluded_equipment) AS t(x)
  WHERE lower(x) = 'bodyweight'
);
