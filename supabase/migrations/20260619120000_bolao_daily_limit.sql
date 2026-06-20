-- Bolao predictor: one prediction per UTC calendar day per user (tracked on feature_usage).

ALTER TABLE public.feature_usage
  ADD COLUMN IF NOT EXISTS bolao_last_used_date date;

CREATE OR REPLACE FUNCTION public.get_bolao_predictor_limits()
RETURNS TABLE (used_today boolean, remaining_today integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_date date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT fu.bolao_last_used_date
  INTO v_last_date
  FROM public.feature_usage fu
  WHERE fu.user_id = v_user_id;

  IF v_last_date = CURRENT_DATE THEN
    RETURN QUERY SELECT true, 0;
  ELSE
    RETURN QUERY SELECT false, 1;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_consume_bolao_prediction()
RETURNS TABLE (allowed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_consumed boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH upsert AS (
    INSERT INTO public.feature_usage (
      user_id,
      bolao_last_used_date,
      monthly_exports_used,
      monthly_llm_requests
    )
    VALUES (v_user_id, CURRENT_DATE, 0, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET bolao_last_used_date = CURRENT_DATE
    WHERE feature_usage.bolao_last_used_date IS NULL
       OR feature_usage.bolao_last_used_date <> CURRENT_DATE
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM upsert) INTO v_consumed;

  RETURN QUERY SELECT v_consumed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bolao_predictor_limits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_consume_bolao_prediction() TO authenticated;
