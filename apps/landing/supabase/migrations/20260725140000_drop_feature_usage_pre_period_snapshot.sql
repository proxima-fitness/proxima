-- Drop the throwaway lifetime snapshot created by
-- 20260725130000_feature_usage_monthly_periods.sql (ADR 0017).
-- Download the table first if you still need the pre-period counters.

DROP TABLE IF EXISTS public.feature_usage_pre_period_snapshot;
