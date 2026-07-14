DROP FUNCTION IF EXISTS public.get_bolao_predictor_limits();
DROP FUNCTION IF EXISTS public.try_consume_bolao_prediction();
ALTER TABLE public.feature_usage
  DROP COLUMN IF EXISTS bolao_last_used_date;
