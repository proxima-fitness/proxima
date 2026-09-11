-- ADR 0015 SP3: Free monthly LLM ceiling 30 → 45 so one mesocycle of
-- AI week suggest (paid generates) can coexist with builder chat.
-- Pro 100 / Pro+ 1000 unchanged. SQL fallback 6000 when the Free row is
-- missing is also unchanged.

UPDATE public.product_usage_limits
SET max_monthly_llm_requests = 45
WHERE product_title = 'Free';
