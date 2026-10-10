-- Atomic check-and-increment against the current Usage period + tier cap.
-- ADR 0019 / PRO-193. Returns allowed=false on deny rather than raising, so
-- callers map to paywall without try/catch on expected denial.
--
-- Cap resolution uses the same Stripe Sync 1.0.32 join path as
-- get_my_feature_limits (product_usage_limits + subscription tier).
-- increment_feature_usage stays as a compatibility shim for one release.

CREATE OR REPLACE FUNCTION "public"."try_consume_feature_usage"("p_feature" "text")
RETURNS TABLE("allowed" boolean)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_period_start date := (date_trunc('month', now() AT TIME ZONE 'utc'))::date;
  v_max integer;
  v_consumed boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_feature NOT IN ('monthly_exports_used', 'monthly_llm_requests') THEN
    RAISE EXCEPTION 'unknown meter: %', p_feature;
  END IF;

  -- Same tier join path as get_my_feature_limits (Stripe Sync 1.0.32 price jsonb).
  SELECT CASE
           WHEN p_feature = 'monthly_exports_used' THEN
             COALESCE(pul.max_monthly_exports, free_pul.max_monthly_exports, 5)
           ELSE
             COALESCE(pul.max_monthly_llm_requests, free_pul.max_monthly_llm_requests, 6000)
         END
    INTO v_max
  FROM (SELECT v_user_id AS user_id) param
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
    SELECT pul.max_monthly_exports, pul.max_monthly_llm_requests
    FROM public.product_usage_limits pul
    WHERE prod.product_title IS NOT NULL AND pul.product_title = prod.product_title
    LIMIT 1
  ) pul ON TRUE
  LEFT JOIN LATERAL (
    SELECT pul.max_monthly_exports, pul.max_monthly_llm_requests
    FROM public.product_usage_limits pul
    WHERE pul.product_title = 'Free'
    LIMIT 1
  ) free_pul ON TRUE;

  -- Ensure the current period row exists (absent = zero used).
  INSERT INTO public.feature_usage AS fu (user_id, period_start, monthly_exports_used, monthly_llm_requests)
  VALUES (v_user_id, v_period_start, 0, 0)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  -- Increment only while under the tier ceiling. Concurrent callers serialize
  -- on the row; the loser re-evaluates the WHERE and may be denied.
  IF p_feature = 'monthly_exports_used' THEN
    UPDATE public.feature_usage
    SET monthly_exports_used = monthly_exports_used + 1
    WHERE user_id = v_user_id
      AND period_start = v_period_start
      AND monthly_exports_used < v_max
    RETURNING TRUE INTO v_consumed;
  ELSE
    UPDATE public.feature_usage
    SET monthly_llm_requests = monthly_llm_requests + 1
    WHERE user_id = v_user_id
      AND period_start = v_period_start
      AND monthly_llm_requests < v_max
    RETURNING TRUE INTO v_consumed;
  END IF;

  RETURN QUERY SELECT COALESCE(v_consumed, false);
END;
$$;

ALTER FUNCTION "public"."try_consume_feature_usage"("p_feature" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."try_consume_feature_usage"("p_feature" "text") IS
  'Atomically spend one unit of a Usage period meter if under the caller''s tier cap. Returns allowed=false at the ceiling without raising.';

REVOKE ALL ON FUNCTION "public"."try_consume_feature_usage"("p_feature" "text") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."try_consume_feature_usage"("p_feature" "text") FROM "anon";
GRANT ALL ON FUNCTION "public"."try_consume_feature_usage"("p_feature" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."try_consume_feature_usage"("p_feature" "text") TO "service_role";
