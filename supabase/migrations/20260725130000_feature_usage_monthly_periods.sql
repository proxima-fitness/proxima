-- Periodise public.feature_usage by calendar month (UTC). ADR 0017 / PRO-195.
--
-- Before: one mutable row per user, counters that never reset, so quota needed
-- manual zeroing and no month-over-month history existed.
-- After: one row per (user_id, period_start), created lazily by the first
-- metered action of the month - an absent row means zero used, so reset is
-- emergent and needs no scheduled job.
--
-- Destructive by design: lifetime counters are snapshotted to a throwaway table
-- and the periodised table starts empty (the series starts with the current
-- month). Order matters: snapshot, verify the snapshot count, then truncate.

-- 1. Snapshot the lifetime rows. Throwaway: download and drop by hand once the
--    migration is verified in prod.
DROP TABLE IF EXISTS public.feature_usage_pre_period_snapshot;

CREATE TABLE public.feature_usage_pre_period_snapshot AS
SELECT * FROM public.feature_usage;

ALTER TABLE public.feature_usage_pre_period_snapshot ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.feature_usage_pre_period_snapshot FROM "anon", "authenticated";

COMMENT ON TABLE public.feature_usage_pre_period_snapshot IS 'Throwaway snapshot of lifetime feature_usage counters taken before ADR 0017 periodised the table. Not carried forward; download and drop.';

-- 2. Refuse to truncate unless the snapshot captured every row.
DO $$
DECLARE
  v_source_count bigint;
  v_snapshot_count bigint;
BEGIN
  SELECT count(*) INTO v_source_count FROM public.feature_usage;
  SELECT count(*) INTO v_snapshot_count FROM public.feature_usage_pre_period_snapshot;

  IF v_source_count <> v_snapshot_count THEN
    RAISE EXCEPTION 'snapshot count mismatch: feature_usage=%, snapshot=%', v_source_count, v_snapshot_count;
  END IF;

  RAISE NOTICE 'snapshotted % lifetime feature_usage rows', v_snapshot_count;
END $$;

TRUNCATE public.feature_usage;

-- 3. Periodise the table.
ALTER TABLE public.feature_usage
  ADD COLUMN "period_start" date NOT NULL DEFAULT (date_trunc('month', now() AT TIME ZONE 'utc'))::date,
  ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE public.feature_usage
  ADD CONSTRAINT "feature_usage_period_start_is_month_start"
  CHECK ("period_start" = date_trunc('month', "period_start")::date);

ALTER TABLE public.feature_usage
  DROP CONSTRAINT IF EXISTS "feature_usage_user_id_key";

ALTER TABLE public.feature_usage
  ADD CONSTRAINT "feature_usage_user_id_period_start_key" UNIQUE ("user_id", "period_start");

COMMENT ON TABLE public.feature_usage IS 'One row per user per Usage period (calendar month, UTC). Created lazily by the first metered action of the month, so an absent row means zero used.';
COMMENT ON COLUMN public.feature_usage."period_start" IS 'First day of the Usage period this row counts (1st of the month, UTC). Not the Stripe billing period.';
COMMENT ON COLUMN public.feature_usage."monthly_exports_used" IS 'Exports charged to this row''s Usage period only - not lifetime.';
COMMENT ON COLUMN public.feature_usage."monthly_llm_requests" IS 'LLM calls charged to this row''s Usage period only - not lifetime.';

-- 4. Write path: period computed server-side, one row per (user, month).
CREATE OR REPLACE FUNCTION "public"."increment_feature_usage"("p_feature" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_period_start date := (date_trunc('month', now() AT TIME ZONE 'utc'))::date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_feature NOT IN ('monthly_exports_used', 'monthly_llm_requests') THEN
    RAISE EXCEPTION 'unknown meter: %', p_feature;
  END IF;

  INSERT INTO public.feature_usage AS fu (user_id, period_start, monthly_exports_used, monthly_llm_requests)
  VALUES (
    v_user_id,
    v_period_start,
    CASE WHEN p_feature = 'monthly_exports_used' THEN 1 ELSE 0 END,
    CASE WHEN p_feature = 'monthly_llm_requests' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, period_start) DO UPDATE
  SET
    monthly_exports_used = fu.monthly_exports_used + CASE WHEN p_feature = 'monthly_exports_used' THEN 1 ELSE 0 END,
    monthly_llm_requests = fu.monthly_llm_requests + CASE WHEN p_feature = 'monthly_llm_requests' THEN 1 ELSE 0 END;
END;
$$;

ALTER FUNCTION "public"."increment_feature_usage"("p_feature" "text") OWNER TO "postgres";

-- 5. Read path: current period only, plus the reset date for blocked-state copy.
--    Dropped rather than replaced because the return columns change.
DROP FUNCTION IF EXISTS "public"."get_my_feature_limits"();

CREATE FUNCTION "public"."get_my_feature_limits"() RETURNS TABLE("user_id" "uuid", "tier" "text", "has_active_subscription" boolean, "max_monthly_exports" integer, "monthly_exports_used" integer, "remaining_exports" integer, "max_monthly_llm_requests" integer, "monthly_llm_requests_used" integer, "remaining_llm_requests" integer, "period_start" "date", "resets_on" "date")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
SELECT
  param.user_id,
  COALESCE(prod.product_title, 'Free') AS tier,
  (s.status IN ('active', 'trialing')) AS has_active_subscription,

  COALESCE(pul.max_monthly_exports,
           free_pul.max_monthly_exports,
           5) AS max_monthly_exports,
  COALESCE(fu.monthly_exports_used, 0) AS monthly_exports_used,
  GREATEST(
    COALESCE(pul.max_monthly_exports, free_pul.max_monthly_exports, 5)
    - COALESCE(fu.monthly_exports_used, 0),
  0) AS remaining_exports,

  COALESCE(pul.max_monthly_llm_requests,
           free_pul.max_monthly_llm_requests,
           6000) AS max_monthly_llm_requests,
  COALESCE(fu.monthly_llm_requests, 0) AS monthly_llm_requests_used,
  GREATEST(
    COALESCE(pul.max_monthly_llm_requests, free_pul.max_monthly_llm_requests, 6000)
    - COALESCE(fu.monthly_llm_requests, 0),
  0) AS remaining_llm_requests,

  period.period_start,
  (period.period_start + INTERVAL '1 month')::date AS resets_on

FROM (SELECT auth.uid()::uuid AS user_id) param

CROSS JOIN (SELECT (date_trunc('month', now() AT TIME ZONE 'utc'))::date AS period_start) period

LEFT JOIN LATERAL (
  SELECT c.id
  FROM stripe.customers c
  WHERE c.metadata->>'client-reference-id' = param.user_id::text
  LIMIT 1
) c ON TRUE

LEFT JOIN LATERAL (
  SELECT s.*
  FROM stripe.subscriptions s
  WHERE c.id IS NOT NULL AND s.customer = c.id
  ORDER BY (s.status IN ('active', 'trialing')) DESC, s.created DESC NULLS LAST
  LIMIT 1
) s ON TRUE

LEFT JOIN LATERAL (
  SELECT prod.name AS product_title
  FROM stripe.subscription_items si
  JOIN stripe.prices pr
    ON pr.id = (CASE
                  WHEN jsonb_typeof(si.price) = 'object' THEN si.price->>'id'
                  ELSE si.price #>> '{}'
                END)
  JOIN stripe.products prod ON prod.id = pr.product
  WHERE s.id IS NOT NULL AND si.subscription = s.id
  LIMIT 1
) prod ON TRUE

LEFT JOIN LATERAL (
  SELECT pul.*
  FROM public.product_usage_limits pul
  WHERE prod.product_title IS NOT NULL AND pul.product_title = prod.product_title
  LIMIT 1
) pul ON TRUE

LEFT JOIN LATERAL (
  SELECT pul.max_monthly_exports, pul.max_monthly_llm_requests
  FROM public.product_usage_limits pul
  WHERE pul.product_title = 'Free'
  LIMIT 1
) free_pul ON TRUE

LEFT JOIN public.feature_usage fu
  ON fu.user_id = param.user_id
 AND fu.period_start = period.period_start
$$;

ALTER FUNCTION "public"."get_my_feature_limits"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."get_my_feature_limits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_feature_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_feature_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_feature_limits"() TO "service_role";
