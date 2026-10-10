-- SPDX-License-Identifier: AGPL-3.0-only

CREATE OR REPLACE FUNCTION public.append_raw_statement(
  p_user_id uuid,
  p_statement text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_constraints
  SET raw_statements = raw_statements || jsonb_build_array(p_statement)
  WHERE user_id = p_user_id
    AND p_user_id = auth.uid();
$$;
