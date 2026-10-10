-- Repair get_my_feature_limits after the Stripe Sync 1.0.19 -> 1.0.32 upgrade.
--
-- Two upstream changes to the sync-engine-owned `stripe` schema broke this function:
--
--   1. stripe.subscription_items.price changed from text (_raw_data ->> 'price') to
--      jsonb (_raw_data -> 'price'). The old `pr.id = si.price` join raised
--      "operator does not exist: text = jsonb", which failed the whole RPC for every
--      caller - so has_active_subscription resolved to false for paying subscribers.
--
--   2. stripe.subscriptions.current_period_end is now always NULL; Stripe moved the
--      field onto subscription items. Ordering by it no longer picks a deterministic
--      subscription, so prefer a live one and fall back to most recently created.

CREATE OR REPLACE FUNCTION "public"."get_my_feature_limits"() RETURNS TABLE("user_id" "uuid", "tier" "text", "has_active_subscription" boolean, "max_monthly_exports" integer, "monthly_exports_used" integer, "remaining_exports" integer, "max_monthly_llm_requests" integer, "monthly_llm_requests_used" integer, "remaining_llm_requests" integer)
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
  0) AS remaining_llm_requests

FROM (SELECT auth.uid()::uuid AS user_id) param

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
$$;
