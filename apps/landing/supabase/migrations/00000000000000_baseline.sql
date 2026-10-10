


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "stripe";


ALTER SCHEMA "stripe" OWNER TO "postgres";


COMMENT ON SCHEMA "stripe" IS 'stripe-sync v1.0.19 installed';



CREATE EXTENSION IF NOT EXISTS "pg_jsonschema" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgmq";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";






CREATE TYPE "public"."source_type" AS ENUM (
    'hevy'
);


ALTER TYPE "public"."source_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."source_type" IS 'A type for different source apps';



CREATE TYPE "stripe"."invoice_status" AS ENUM (
    'draft',
    'open',
    'paid',
    'uncollectible',
    'void',
    'deleted'
);


ALTER TYPE "stripe"."invoice_status" OWNER TO "postgres";


CREATE TYPE "stripe"."pricing_tiers" AS ENUM (
    'graduated',
    'volume'
);


ALTER TYPE "stripe"."pricing_tiers" OWNER TO "postgres";


CREATE TYPE "stripe"."pricing_type" AS ENUM (
    'one_time',
    'recurring'
);


ALTER TYPE "stripe"."pricing_type" OWNER TO "postgres";


CREATE TYPE "stripe"."subscription_schedule_status" AS ENUM (
    'not_started',
    'active',
    'completed',
    'released',
    'canceled'
);


ALTER TYPE "stripe"."subscription_schedule_status" OWNER TO "postgres";


CREATE TYPE "stripe"."subscription_status" AS ENUM (
    'trialing',
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'unpaid',
    'paused'
);


ALTER TYPE "stripe"."subscription_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_secret"("secret_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  rows_deleted int;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  delete from vault.decrypted_secrets 
    where name = secret_name AND description = auth.uid()::text;

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  if rows_deleted = 0 then
    return 'no matching secret found';
  else
    return 'secret deleted';
  end if;
end;
$$;


ALTER FUNCTION "public"."delete_secret"("secret_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_bolao_predictor_limits"() RETURNS TABLE("used_today" boolean, "remaining_today" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_bolao_predictor_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_hevy_key_from_vault"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_secret TEXT;
BEGIN
  -- We use the user_id in the name to find the right secret
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'hevy_api_key_' || p_user_id::text
  LIMIT 1;

  RETURN v_secret;
END;
$$;


ALTER FUNCTION "public"."get_hevy_key_from_vault"("p_user_id" "uuid") OWNER TO "postgres";


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
  ORDER BY s.current_period_end DESC NULLS LAST
  LIMIT 1
) s ON TRUE

LEFT JOIN LATERAL (
  SELECT prod.name AS product_title
  FROM stripe.subscription_items si
  JOIN stripe.prices pr ON pr.id = (si.price #>> '{}')
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


ALTER FUNCTION "public"."get_my_feature_limits"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_add_user_onboarding_emails"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.onboarding_emails (user_id)
  values (new.id);

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_add_user_onboarding_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_delete_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  DELETE FROM public.users WHERE id = old.id;
  RETURN old;
END;
$$;


ALTER FUNCTION "public"."handle_delete_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_base_username TEXT;
  v_final_username TEXT;
  v_counter INTEGER := 1;
BEGIN
  -- 1. Extract Names (App keys -> Google keys -> Full Name fallback)
  v_first_name := COALESCE(
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'given_name',
    new.raw_user_meta_data ->> 'givenName',
    split_part(new.raw_user_meta_data ->> 'full_name', ' ', 1),
    split_part(new.raw_user_meta_data ->> 'name', ' ', 1)
  );

  v_last_name := COALESCE(
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'family_name',
    new.raw_user_meta_data ->> 'familyName',
    NULLIF(substring(new.raw_user_meta_data ->> 'full_name' from ' (.*)'), ''),
    NULLIF(substring(new.raw_user_meta_data ->> 'name' from ' (.*)'), '')
  );

  -- 2. Create and Sanitize Base Username (e.g., "john.doe")
  v_base_username := COALESCE(
    new.raw_user_meta_data ->> 'username',
    CASE 
      WHEN v_first_name IS NOT NULL AND v_last_name IS NOT NULL 
      THEN LOWER(v_first_name || '.' || v_last_name)
      ELSE split_part(new.email, '@', 1)
    END
  );
  
  -- Remove illegal characters: only allow a-z, 0-9, dots, and underscores
  v_base_username := LOWER(REGEXP_REPLACE(v_base_username, '[^a-z0-9._]', '', 'g'));
  v_final_username := v_base_username;

  -- 3. The Uniqueness Loop
  -- Keep checking if the username exists; if it does, append an incrementing number
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = v_final_username AND id != new.id) LOOP
    v_final_username := v_base_username || v_counter::TEXT;
    v_counter := v_counter + 1;
  END LOOP;

  -- 4. Final Insert (with UPSERT fallback)
  -- The ON CONFLICT handles cases where the same ID signs up again (e.g., after a soft delete)
  INSERT INTO public.users (id, email, first_name, last_name, username)
  VALUES (
    new.id,
    new.email,
    v_first_name,
    v_last_name,
    v_final_username
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    username = EXCLUDED.username;

  RETURN new;
END;$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_feature_usage"("p_feature" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.feature_usage AS fu (user_id, monthly_exports_used, monthly_llm_requests)
  VALUES (
    v_user_id,
    CASE WHEN p_feature = 'monthly_exports_used' THEN 1 ELSE 0 END,
    CASE WHEN p_feature = 'monthly_llm_requests' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    monthly_exports_used = fu.monthly_exports_used + CASE WHEN p_feature = 'monthly_exports_used' THEN 1 ELSE 0 END,
    monthly_llm_requests = fu.monthly_llm_requests + CASE WHEN p_feature = 'monthly_llm_requests' THEN 1 ELSE 0 END;
END;
$$;


ALTER FUNCTION "public"."increment_feature_usage"("p_feature" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_program_saves"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  update programs
  set saves = saves + 1
  where id = new.program_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."increment_program_saves"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_secret"("secret" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Ensure the user is authenticated (i.e., logged in)
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  -- Create a secret in the vault using the authenticated user's unique identifier (auth.uid())
  return vault.create_secret(secret, 'hevy_api_key_' || auth.uid()::text, auth.uid()::text);
end;
$$;


ALTER FUNCTION "public"."insert_secret"("secret" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."programs_tsvector_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    new.programs_textsearchable_index_col :=
        to_tsvector('english', 
            coalesce(new.title, '') || ' ' || 
            coalesce(new.details, '') || ' ' || 
            coalesce(new.equipment, '')
        );

    return new;
end
$$;


ALTER FUNCTION "public"."programs_tsvector_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."read_secret"("secret_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  secret TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT decrypted_secret INTO secret
  FROM vault.decrypted_secrets
  WHERE name = secret_name AND description = auth.uid()::text;

  IF secret IS NULL THEN
    RAISE EXCEPTION 'Not authorized or secret does not exist';
  END IF;

  RETURN secret;
END;
$$;


ALTER FUNCTION "public"."read_secret"("secret_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revise_backed_up_workout"("p_workout_id" "uuid", "p_title" "text", "p_description" "text", "p_started_at" timestamp with time zone, "p_ended_at" timestamp with time zone, "p_source_updated_at" timestamp with time zone, "p_exercises" "jsonb", "p_sets" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.workouts
  SET
    title = p_title,
    description = p_description,
    started_at = p_started_at,
    ended_at = p_ended_at,
    source_updated_at = p_source_updated_at
  WHERE id = p_workout_id;

  DELETE FROM public.workout_sets
  WHERE workout_exercise_id IN (
    SELECT id FROM public.workout_exercises WHERE workout_id = p_workout_id
  );

  DELETE FROM public.workout_exercises
  WHERE workout_id = p_workout_id;

  INSERT INTO public.workout_exercises (
    id,
    workout_id,
    canonical_exercise_id,
    sort_order,
    source_exercise_id,
    notes,
    superset_id
  )
  SELECT
    x.id::uuid,
    p_workout_id,
    x.canonical_exercise_id::uuid,
    x.sort_order::smallint,
    x.source_exercise_id,
    x.notes,
    x.superset_id
  FROM jsonb_to_recordset(p_exercises) AS x(
    id text,
    canonical_exercise_id text,
    sort_order smallint,
    source_exercise_id text,
    notes text,
    superset_id integer
  );

  INSERT INTO public.workout_sets (
    id,
    workout_exercise_id,
    set_index,
    set_type,
    weight_kg,
    reps,
    duration_seconds,
    distance_meters,
    rpe,
    custom_metric,
    rep_range_start,
    rep_range_end
  )
  SELECT
    x.id::uuid,
    x.workout_exercise_id::uuid,
    x.set_index::smallint,
    x.set_type,
    x.weight_kg,
    x.reps,
    x.duration_seconds,
    x.distance_meters,
    x.rpe,
    x.custom_metric,
    x.rep_range_start,
    x.rep_range_end
  FROM jsonb_to_recordset(p_sets) AS x(
    id text,
    workout_exercise_id text,
    set_index smallint,
    set_type text,
    weight_kg numeric,
    reps smallint,
    duration_seconds integer,
    distance_meters numeric,
    rpe numeric,
    custom_metric numeric,
    rep_range_start smallint,
    rep_range_end smallint
  );
END;
$$;


ALTER FUNCTION "public"."revise_backed_up_workout"("p_workout_id" "uuid", "p_title" "text", "p_description" "text", "p_started_at" timestamp with time zone, "p_ended_at" timestamp with time zone, "p_source_updated_at" timestamp with time zone, "p_exercises" "jsonb", "p_sets" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."programs" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "details" "text",
    "program_length" smallint,
    "workout_duration" smallint,
    "equipment" "text",
    "specialization" "text"[],
    "difficulty" "text"[],
    "explore" boolean DEFAULT false,
    "user_id" "uuid",
    "programs_textsearchable_index_col" "tsvector",
    "saves" integer DEFAULT 0 NOT NULL,
    "prompt" "text",
    "id" integer NOT NULL,
    "lock" boolean,
    "is_coach" boolean,
    CONSTRAINT "programs_description_check" CHECK (("length"("details") < 3000)),
    CONSTRAINT "programs_new_id_check" CHECK (("id" > 0)),
    CONSTRAINT "programs_prompt_check" CHECK (("length"("prompt") < 3000)),
    CONSTRAINT "programs_title_check" CHECK (("length"("title") < 1000))
);


ALTER TABLE "public"."programs" OWNER TO "postgres";


COMMENT ON TABLE "public"."programs" IS 'A Table to store all user-created Programs (trainers & trainees)';



COMMENT ON COLUMN "public"."programs"."title" IS 'Program Title';



COMMENT ON COLUMN "public"."programs"."details" IS 'Program Description';



COMMENT ON COLUMN "public"."programs"."program_length" IS 'Length of program in weeks';



COMMENT ON COLUMN "public"."programs"."workout_duration" IS 'Time per workout in Minutes';



COMMENT ON COLUMN "public"."programs"."equipment" IS 'Minimum equipment needed to complete workouts in program';



COMMENT ON COLUMN "public"."programs"."specialization" IS 'The type of training used in the program';



COMMENT ON COLUMN "public"."programs"."difficulty" IS 'The difficulty level of the program';



COMMENT ON COLUMN "public"."programs"."explore" IS 'Boolean to share to Explore page';



COMMENT ON COLUMN "public"."programs"."saves" IS 'A denormalized count of the number of times this program has been saved by a user';



COMMENT ON COLUMN "public"."programs"."prompt" IS 'If this program was built in the AI program builder, then this was the prompt used. This will also be used to display previous AI Programs there too';



COMMENT ON COLUMN "public"."programs"."lock" IS 'if lock is true then this program will appear locked on the explore page';



COMMENT ON COLUMN "public"."programs"."is_coach" IS 'A boolean for whether this program is made by a Coach';



CREATE OR REPLACE FUNCTION "public"."search_programs_by_prefix"("prefix" "text") RETURNS SETOF "public"."programs"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$begin
    return query
    select *
    from programs
    where programs_textsearchable_index_col @@ to_tsquery(
        regexp_replace(prefix, '\s+', ' & ', 'g') || ':*'
    )
    and explore = true
    limit 10;
end;$$;


ALTER FUNCTION "public"."search_programs_by_prefix"("prefix" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "textsearchable_index_col" "tsvector",
    "username" "text",
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'Profile data for each user.';



COMMENT ON COLUMN "public"."users"."id" IS 'References the internal Supabase Auth user.';



COMMENT ON COLUMN "public"."users"."username" IS 'Unique User Name';



CREATE OR REPLACE FUNCTION "public"."search_users_by_prefix"("prefix" "text") RETURNS SETOF "public"."users"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$begin
    return query
    select *
    from users
    where textsearchable_index_col @@ to_tsquery(
        regexp_replace(prefix, '\s+', ' & ', 'g') || ':*'
    )
    limit 10;
end;$$;


ALTER FUNCTION "public"."search_users_by_prefix"("prefix" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new._updated_at = now();
  return NEW;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_metadata"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return NEW;
end;
$$;


ALTER FUNCTION "public"."set_updated_at_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_all_users_hevy_program_sync"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
  user_record RECORD;
  batch_size INT := 50; -- Number of functions to fire before a short rest
  counter INT := 0;
BEGIN
  -- 1. Filter the loop at the source so we don't waste CPU
  FOR user_record IN 
    SELECT id FROM public.users 
    WHERE 
      -- Case 1: They have a timezone, and it's currently the 00:00 hour there
      (timezone IS NOT NULL AND EXTRACT(HOUR FROM (now() AT TIME ZONE timezone)) = 0)
      OR 
      -- Case 2: No timezone set, default to midnight UTC
      (timezone IS NULL AND EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC')) = 0)
  LOOP
    
    -- 2. Fire the Edge Function
    PERFORM net.http_post(
      url := 'https://oivloxjpauqrggayaovk.supabase.co/functions/v1/hevy-program-sync',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('user_id', user_record.id),
      timeout_milliseconds := 30000 
    );
    
    -- 3. Scaling logic: rest for 1 second every 50 users to protect the DB pool
    counter := counter + 1;
    IF counter % batch_size = 0 THEN
      PERFORM pg_sleep(1);
    END IF;

  END LOOP;

  -- Log the result to Postgres Logs for easy debugging
  RAISE LOG 'Midnight sync triggered for % users.', counter;
END;$$;


ALTER FUNCTION "public"."trigger_all_users_hevy_program_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."try_consume_bolao_prediction"() RETURNS TABLE("allowed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."try_consume_bolao_prediction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."users_tsvector_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
    new.textsearchable_index_col :=
        to_tsvector('english', 
            coalesce(new.first_name, '') || ' ' ||
            coalesce(new.last_name, '') || ' ' ||
            coalesce(new.username, '')
        );

    return new;
end;
$$;


ALTER FUNCTION "public"."users_tsvector_update"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blocked_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "blocked_id" "uuid"
);


ALTER TABLE "public"."blocked_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."blocked_users" IS 'join table between users and the users they''ve blocked';



COMMENT ON COLUMN "public"."blocked_users"."user_id" IS 'ID of the blocker';



COMMENT ON COLUMN "public"."blocked_users"."blocked_id" IS 'ID of blocked user';



CREATE TABLE IF NOT EXISTS "public"."canonical_exercise_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "public"."source_type" NOT NULL,
    "external_exercise_id" "text" NOT NULL,
    "canonical_exercise_id" "uuid" NOT NULL
);


ALTER TABLE "public"."canonical_exercise_mappings" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_exercise_mappings" IS 'A JOIN table to map source exercises with the canonical exercise';



COMMENT ON COLUMN "public"."canonical_exercise_mappings"."source" IS 'Which fitness app did this exercise come from?';



COMMENT ON COLUMN "public"."canonical_exercise_mappings"."external_exercise_id" IS 'The exercise ID from the integrated app';



COMMENT ON COLUMN "public"."canonical_exercise_mappings"."canonical_exercise_id" IS 'The ID of the canonical exercise that is linked to this source exercise ID';



CREATE TABLE IF NOT EXISTS "public"."canonical_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "normalized_title" "text" NOT NULL,
    "primary_muscle_group" "text",
    "secondary_muscle_groups" "text"[],
    "equipment" "text",
    "exercise_type" "text",
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."canonical_exercises" OWNER TO "postgres";


COMMENT ON TABLE "public"."canonical_exercises" IS 'This is the list of app independent exercises that create our base data source';



CREATE TABLE IF NOT EXISTS "public"."chat_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "program_id" integer,
    "conversation" "jsonb"[],
    "pinned" boolean,
    CONSTRAINT "chat_history_title_check" CHECK (("length"("title") <= 200))
);


ALTER TABLE "public"."chat_history" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chat_history"."title" IS 'An AI-generated title for the chat';



COMMENT ON COLUMN "public"."chat_history"."program_id" IS 'FK to associated program for this chat history';



COMMENT ON COLUMN "public"."chat_history"."conversation" IS 'This stores the "messages" from the ai-sdk ai agent as an array of objects';



COMMENT ON COLUMN "public"."chat_history"."pinned" IS 'Is this a pinned chat ?';



CREATE TABLE IF NOT EXISTS "public"."feature_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "monthly_exports_used" smallint DEFAULT '0'::smallint NOT NULL,
    "monthly_llm_requests" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."feature_usage" OWNER TO "postgres";


COMMENT ON COLUMN "public"."feature_usage"."monthly_exports_used" IS 'The number of times this user has exported a progrma in the current month';



COMMENT ON COLUMN "public"."feature_usage"."monthly_llm_requests" IS 'Tracks how many LLM calls have been made by this user in a the current month';



CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "feedback" "text",
    "id" "uuid" NOT NULL,
    CONSTRAINT "feedback_feedback_check" CHECK (("length"("feedback") < 100000))
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."feedback" IS 'User Feedback';



COMMENT ON COLUMN "public"."feedback"."feedback" IS 'Text from user with feedback on app';



CREATE TABLE IF NOT EXISTS "public"."followers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "follower_id" "uuid",
    "following_id" "uuid"
);


ALTER TABLE "public"."followers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hevy_exercise_templates" (
    "id" "text" NOT NULL,
    "title" "text",
    "type" "text",
    "primary_muscle_group" "text",
    "secondary_muscle_groups" "text"[],
    "is_custom" boolean,
    "equipment" "text",
    "normalized_title" "text",
    "gif_id" "text",
    "instructions" "text"[]
);


ALTER TABLE "public"."hevy_exercise_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."hevy_exercise_templates" IS 'All the exercises hevy has available from their API';



COMMENT ON COLUMN "public"."hevy_exercise_templates"."title" IS 'The title of the exercise';



COMMENT ON COLUMN "public"."hevy_exercise_templates"."type" IS 'The type of exercise: weight_reps (e.g. Squat (Barbell)), distance_duration (Sled Push), reps_only (e.g. Kipping Pullup), duration (e.g. Boxing) , bodyweight_weighted (e.g. Decline Crunch (Weighted)), bodyweight_assisted (e.g. Pull Up (Band)), short_distance_weight (e.g. Walking lunge dumbbell), floors_duration (Stair Machine Floors), steps_duration (Stair Machine Steps)';



COMMENT ON COLUMN "public"."hevy_exercise_templates"."normalized_title" IS 'A column that holds the alphabetically ordered, parantheses removed, lowercase version of the title column';



COMMENT ON COLUMN "public"."hevy_exercise_templates"."gif_id" IS 'id that corresponds to storage link for gif';



COMMENT ON COLUMN "public"."hevy_exercise_templates"."instructions" IS 'The explanation on how to do the lift';



CREATE TABLE IF NOT EXISTS "public"."hevy_workouts_count" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_known_workout_count" integer,
    "sync_error" "text",
    "last_synced_page" integer
);


ALTER TABLE "public"."hevy_workouts_count" OWNER TO "postgres";


COMMENT ON TABLE "public"."hevy_workouts_count" IS 'This tracks the most recently known number of completed Hevy workouts. Whenever it differs from the count found in /v1/workouts/count we can use that to trigger an action';



COMMENT ON COLUMN "public"."hevy_workouts_count"."last_known_workout_count" IS 'The last updated workout count';



COMMENT ON COLUMN "public"."hevy_workouts_count"."sync_error" IS 'Set when workout history sync fails mid-backfill; cleared after a successful retry. NULL while syncing or when idle.';



COMMENT ON COLUMN "public"."hevy_workouts_count"."last_synced_page" IS 'Last Hevy workouts list page processed during backfill (1-based). Null until first chunk completes.';



CREATE TABLE IF NOT EXISTS "public"."onboarding_emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "welcome_email" boolean,
    "programs_product_education_email" boolean,
    "hevy_product_education_email" boolean,
    "value_add_content_email" boolean,
    "feedback_email" boolean,
    "behind_the_scenes_email" boolean,
    "customer_stories_email" boolean,
    "promotions_offers_email" boolean,
    "user_id" "uuid"
);


ALTER TABLE "public"."onboarding_emails" OWNER TO "postgres";


COMMENT ON TABLE "public"."onboarding_emails" IS 'boolean flags that track if the user has received an onboarding email';



COMMENT ON COLUMN "public"."onboarding_emails"."welcome_email" IS 'Has user received the welcome email';



COMMENT ON COLUMN "public"."onboarding_emails"."programs_product_education_email" IS 'Has user received the Program & AI Program builder product education email';



COMMENT ON COLUMN "public"."onboarding_emails"."hevy_product_education_email" IS 'Has the user received the Hevy and AI Program Builder product education email';



COMMENT ON COLUMN "public"."onboarding_emails"."value_add_content_email" IS 'Has the user received the Value Add Content email';



COMMENT ON COLUMN "public"."onboarding_emails"."feedback_email" IS 'Has user received feedback email with Google Form';



COMMENT ON COLUMN "public"."onboarding_emails"."behind_the_scenes_email" IS 'Has user received the behind the scenes email';



COMMENT ON COLUMN "public"."onboarding_emails"."customer_stories_email" IS 'Has the user received the email with other customer reviews and success stories';



COMMENT ON COLUMN "public"."onboarding_emails"."promotions_offers_email" IS 'Has user received the promotions / offers email with the CTA';



CREATE TABLE IF NOT EXISTS "public"."onboarding_survey" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gender" "text",
    "user_id" "uuid",
    "goals" "text"[],
    "motivations" "text"[],
    "focus_areas" "text"[],
    "fitness_level" "text",
    "height" smallint,
    "age" smallint,
    "activity_level" "text",
    "health_issues" "text"[],
    "equipment" "text",
    "days_per_week" smallint,
    "workout_days" "text"[]
);


ALTER TABLE "public"."onboarding_survey" OWNER TO "postgres";


COMMENT ON TABLE "public"."onboarding_survey" IS 'The data collected from user upon onboarding to help tailor their experience';



COMMENT ON COLUMN "public"."onboarding_survey"."goals" IS 'Purpose for using the app';



COMMENT ON COLUMN "public"."onboarding_survey"."motivations" IS 'What inspires the user to workout';



COMMENT ON COLUMN "public"."onboarding_survey"."focus_areas" IS 'Muscle groups to focus on';



COMMENT ON COLUMN "public"."onboarding_survey"."fitness_level" IS 'Beginner, Novice, Intermediate, Advanced';



COMMENT ON COLUMN "public"."onboarding_survey"."height" IS 'How tall is the user';



COMMENT ON COLUMN "public"."onboarding_survey"."activity_level" IS 'what kind of lifestyle does the user have';



COMMENT ON COLUMN "public"."onboarding_survey"."health_issues" IS 'Any injuries or health problems to be noted';



COMMENT ON COLUMN "public"."onboarding_survey"."equipment" IS 'Available gym equipment';



COMMENT ON COLUMN "public"."onboarding_survey"."days_per_week" IS 'how many days per week they will workout';



COMMENT ON COLUMN "public"."onboarding_survey"."workout_days" IS 'Specific days of the week user would like to train on';



CREATE TABLE IF NOT EXISTS "public"."personal_records" (
    "created_at" timestamp with time zone DEFAULT "now"(),
    "id" "uuid" NOT NULL,
    "exercise_id" "uuid",
    "user_id" "uuid",
    "personalRecordMaxes" real[]
);


ALTER TABLE "public"."personal_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."personal_records" IS 'Contains exercise data for each user';



COMMENT ON COLUMN "public"."personal_records"."personalRecordMaxes" IS 'An array of personal record maxes';



CREATE TABLE IF NOT EXISTS "public"."policy_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_type" "text" NOT NULL,
    "version_label" "text" NOT NULL,
    "effective_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "policy_versions_document_type_check" CHECK (("document_type" = ANY (ARRAY['terms_of_use'::"text", 'privacy_policy'::"text"])))
);


ALTER TABLE "public"."policy_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_usage_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "max_monthly_exports" smallint,
    "max_monthly_llm_requests" smallint,
    "product_title" "text",
    "max_premium_llm_requests" smallint
);


ALTER TABLE "public"."product_usage_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_usage_limits" IS 'Defines the montly usage limits for stripe features';



COMMENT ON COLUMN "public"."product_usage_limits"."max_monthly_exports" IS 'The maximum number of exports this product is allowed';



COMMENT ON COLUMN "public"."product_usage_limits"."max_premium_llm_requests" IS 'The max number of higher powered model requests before we drop you to a cheaper model';



CREATE TABLE IF NOT EXISTS "public"."program_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "user_id" "uuid",
    "program_length" smallint,
    "program_id" integer NOT NULL
);


ALTER TABLE "public"."program_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."program_history" IS 'History of Programs completed';



COMMENT ON COLUMN "public"."program_history"."title" IS 'Title of a Program';



COMMENT ON COLUMN "public"."program_history"."program_length" IS 'Length of the Program';



COMMENT ON COLUMN "public"."program_history"."program_id" IS 'The ID for the program connected to programs table';



CREATE TABLE IF NOT EXISTS "public"."program_schedule_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nthWeek" smallint,
    "nthDay" smallint,
    "program_history_id" "uuid",
    "user_id" "uuid"
);


ALTER TABLE "public"."program_schedule_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."program_schedule_history" IS 'The schedule for the program history';



COMMENT ON COLUMN "public"."program_schedule_history"."nthWeek" IS 'The Number for the week of the program history';



COMMENT ON COLUMN "public"."program_schedule_history"."nthDay" IS 'The number of the day in the program history week';



COMMENT ON COLUMN "public"."program_schedule_history"."program_history_id" IS 'FK for program_history table';



CREATE TABLE IF NOT EXISTS "public"."program_subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "program_id" integer NOT NULL
);


ALTER TABLE "public"."program_subscribers" OWNER TO "postgres";


COMMENT ON TABLE "public"."program_subscribers" IS 'join table between users and the programs they''ve joined';



CREATE TABLE IF NOT EXISTS "public"."program_workout_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "old_exercise_id" "uuid",
    "reps" real[],
    "weights" real[],
    "reps_max" real[],
    "reps_range" real[],
    "rpe" real[],
    "rpe_range" real[],
    "time_taken" real[],
    "time_range" real[],
    "amrap" "text"[],
    "percent_rm" real[],
    "schedule_id" "uuid",
    "set_types" "text"[],
    "supersets_id" smallint,
    "exercise_id" "text"
);


ALTER TABLE "public"."program_workout_exercises" OWNER TO "postgres";


COMMENT ON TABLE "public"."program_workout_exercises" IS 'Stores individual workouts inside a program (similar to saved_workouts)';



COMMENT ON COLUMN "public"."program_workout_exercises"."old_exercise_id" IS 'Foreign Key that points to exercises table';



COMMENT ON COLUMN "public"."program_workout_exercises"."schedule_id" IS 'The FK for the id on the schedule_workouts table';



COMMENT ON COLUMN "public"."program_workout_exercises"."set_types" IS 'An array of either "normal", "warmup", "dropset" or "failure"';



COMMENT ON COLUMN "public"."program_workout_exercises"."supersets_id" IS 'The ID of the superset the exercise belongs to';



COMMENT ON COLUMN "public"."program_workout_exercises"."exercise_id" IS 'foreign key to the hevy exercises table';



CREATE TABLE IF NOT EXISTS "public"."program_workout_exercises_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "old_exercise_id" "uuid",
    "reps" smallint[],
    "weights" real[],
    "rpe" smallint[],
    "time_taken" real[],
    "amrap" "text"[],
    "program_schedule_history_id" "uuid",
    "user_id" "uuid",
    "exercise_id" "text"
);


ALTER TABLE "public"."program_workout_exercises_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."program_workout_exercises_history" IS 'The workout of the day completed in a program history';



COMMENT ON COLUMN "public"."program_workout_exercises_history"."old_exercise_id" IS 'The FK to exercises table';



COMMENT ON COLUMN "public"."program_workout_exercises_history"."amrap" IS 'As many reps as possible';



COMMENT ON COLUMN "public"."program_workout_exercises_history"."program_schedule_history_id" IS 'FK to program_schedule_history table';



ALTER TABLE "public"."programs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."programs_new_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason" "text",
    "user_id" "uuid",
    "status" "text",
    "program_id" integer NOT NULL,
    CONSTRAINT "reports_reason_check" CHECK (("length"("reason") < 3000))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


COMMENT ON TABLE "public"."reports" IS 'A table for reported programs and users';



COMMENT ON COLUMN "public"."reports"."reason" IS 'A reason that the item is being reported';



COMMENT ON COLUMN "public"."reports"."user_id" IS 'The column that links the user that has been reported';



COMMENT ON COLUMN "public"."reports"."status" IS '"pending", "in review", "resolved"';



CREATE TABLE IF NOT EXISTS "public"."saved_workout_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "old_exercise_id" "uuid",
    "reps" smallint[],
    "weights" real[],
    "reps_max" smallint[],
    "reps_range" smallint[],
    "rpe" smallint[],
    "rpe_range" smallint[],
    "time_taken" smallint[],
    "time_range" smallint[],
    "amrap" "text"[],
    "percent_rm" real[],
    "saved_workout_id" "uuid",
    "set_types" "text"[],
    "supersets_id" smallint,
    "exercise_id" "text"
);


ALTER TABLE "public"."saved_workout_exercises" OWNER TO "postgres";


COMMENT ON TABLE "public"."saved_workout_exercises" IS 'Stores exercises within a saved workout';



COMMENT ON COLUMN "public"."saved_workout_exercises"."old_exercise_id" IS 'Foreign key that points at exercise table';



COMMENT ON COLUMN "public"."saved_workout_exercises"."reps_range" IS 'A 2D array for the reps range values';



COMMENT ON COLUMN "public"."saved_workout_exercises"."saved_workout_id" IS 'FK to the Saved workouts table';



COMMENT ON COLUMN "public"."saved_workout_exercises"."set_types" IS 'An array of "normal", "warmup","dropset" or "failure"';



COMMENT ON COLUMN "public"."saved_workout_exercises"."supersets_id" IS 'The ID of the superset the exercise belongs to';



CREATE TABLE IF NOT EXISTS "public"."saved_workouts" (
    "created_at" timestamp with time zone DEFAULT "now"(),
    "workout_name" "text",
    "id" "uuid" NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."saved_workouts" OWNER TO "postgres";


COMMENT ON TABLE "public"."saved_workouts" IS 'stores saved workouts';



CREATE TABLE IF NOT EXISTS "public"."schedule_workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nthWeek" smallint,
    "nthDay" smallint,
    "day_title" "text",
    "day_notes" "text",
    "program_id" integer,
    CONSTRAINT "schedule_workouts_day_notes_check" CHECK (("length"("day_notes") < 3000))
);


ALTER TABLE "public"."schedule_workouts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."schedule_workouts"."day_title" IS 'The title for this specific day in the program';



COMMENT ON COLUMN "public"."schedule_workouts"."day_notes" IS 'The "routine" notes for a day in a program';



CREATE TABLE IF NOT EXISTS "public"."test_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."test_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trending" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title_english" "text",
    "title_portugues" "text",
    "title_francais" "text",
    "title_espanol" "text",
    "program_ids" "uuid"[]
);


ALTER TABLE "public"."trending" OWNER TO "postgres";


COMMENT ON TABLE "public"."trending" IS 'Stores data to be displayed on Home Page for trending programs';



COMMENT ON COLUMN "public"."trending"."title_english" IS 'title of carousel';



COMMENT ON COLUMN "public"."trending"."program_ids" IS 'An array of Program IDs for this Carousel';



CREATE TABLE IF NOT EXISTS "public"."user_consents" (
    "user_id" "uuid" NOT NULL,
    "terms_version_id" "uuid" NOT NULL,
    "privacy_version_id" "uuid" NOT NULL,
    "legal_accepted_at" timestamp with time zone NOT NULL,
    "platform_improvement_opt_in" boolean DEFAULT false NOT NULL,
    "platform_improvement_opt_in_at" timestamp with time zone,
    "marketing_opt_in" boolean DEFAULT false NOT NULL,
    "marketing_opt_in_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_consents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "canonical_exercise_id" "uuid" NOT NULL,
    "sort_order" smallint NOT NULL,
    "source_exercise_id" "text",
    "notes" "text",
    "superset_id" integer
);


ALTER TABLE "public"."workout_exercises" OWNER TO "postgres";


COMMENT ON COLUMN "public"."workout_exercises"."notes" IS 'Exercise-level notes from the source app.';



COMMENT ON COLUMN "public"."workout_exercises"."superset_id" IS 'Superset group id from the source app; null when not grouped.';



CREATE TABLE IF NOT EXISTS "public"."workout_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "workout_exercise_id" "uuid" NOT NULL,
    "set_index" smallint NOT NULL,
    "set_type" "text" NOT NULL,
    "weight_kg" numeric,
    "reps" smallint,
    "duration_seconds" integer,
    "distance_meters" numeric,
    "rpe" numeric,
    "custom_metric" numeric,
    "rep_range_start" smallint,
    "rep_range_end" smallint
);


ALTER TABLE "public"."workout_sets" OWNER TO "postgres";


COMMENT ON TABLE "public"."workout_sets" IS 'Normalized canonical log of the sets in a workout';



COMMENT ON COLUMN "public"."workout_sets"."set_index" IS 'Hevy sets[].index';



COMMENT ON COLUMN "public"."workout_sets"."set_type" IS 'normal, warmup, dropset, failure';



COMMENT ON COLUMN "public"."workout_sets"."rep_range_start" IS 'Hevy rep_range.start - optional';



COMMENT ON COLUMN "public"."workout_sets"."rep_range_end" IS 'Hevy rep_range.end - optional';



CREATE TABLE IF NOT EXISTS "public"."workouts" (
    "created_at" timestamp with time zone DEFAULT "now"(),
    "title" "text",
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source" "public"."source_type",
    "external_id" "text",
    "started_at" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone,
    "description" "text",
    "source_updated_at" timestamp with time zone
);


ALTER TABLE "public"."workouts" OWNER TO "postgres";


COMMENT ON TABLE "public"."workouts" IS 'Last 14 days of workouts completed';



COMMENT ON COLUMN "public"."workouts"."title" IS 'The title of the completed workout';



COMMENT ON COLUMN "public"."workouts"."source" IS 'Multi-fitness app source title';



COMMENT ON COLUMN "public"."workouts"."external_id" IS 'The external ID from the connected app. Could be a uuid, could be numerical could be something else.';



COMMENT ON COLUMN "public"."workouts"."description" IS 'Workout-level notes from the source app (Hevy description).';



COMMENT ON COLUMN "public"."workouts"."source_updated_at" IS 'Last updated_at from the connected app (e.g. Hevy) at import/revise time; distinct from workouts.updated_at.';



CREATE TABLE IF NOT EXISTS "stripe"."_managed_webhooks" (
    "id" "text" NOT NULL,
    "object" "text",
    "url" "text" NOT NULL,
    "enabled_events" "jsonb" NOT NULL,
    "description" "text",
    "enabled" boolean,
    "livemode" boolean,
    "metadata" "jsonb",
    "secret" "text" NOT NULL,
    "status" "text",
    "api_version" "text",
    "created" integer,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "last_synced_at" timestamp with time zone,
    "account_id" "text" NOT NULL
);


ALTER TABLE "stripe"."_managed_webhooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."_migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "stripe"."_migrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."_sync_obj_runs" (
    "_account_id" "text" NOT NULL,
    "run_started_at" timestamp with time zone NOT NULL,
    "object" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "processed_count" integer DEFAULT 0,
    "cursor" "text",
    "error_message" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "page_cursor" "text",
    CONSTRAINT "_sync_obj_run_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'complete'::"text", 'error'::"text"])))
);


ALTER TABLE "stripe"."_sync_obj_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."_sync_runs" (
    "_account_id" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "max_concurrent" integer DEFAULT 3 NOT NULL,
    "error_message" "text",
    "triggered_by" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closed_at" timestamp with time zone
);


ALTER TABLE "stripe"."_sync_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."accounts" (
    "_raw_data" "jsonb" NOT NULL,
    "first_synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "_last_synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "business_name" "text" GENERATED ALWAYS AS ((("_raw_data" -> 'business_profile'::"text") ->> 'name'::"text")) STORED,
    "email" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'email'::"text")) STORED,
    "type" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'type'::"text")) STORED,
    "charges_enabled" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'charges_enabled'::"text"))::boolean) STORED,
    "payouts_enabled" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'payouts_enabled'::"text"))::boolean) STORED,
    "details_submitted" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'details_submitted'::"text"))::boolean) STORED,
    "country" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'country'::"text")) STORED,
    "default_currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'default_currency'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "api_key_hashes" "text"[] DEFAULT '{}'::"text"[],
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."active_entitlements" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "feature" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'feature'::"text")) STORED,
    "customer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer'::"text")) STORED,
    "lookup_key" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'lookup_key'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."active_entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."charges" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "paid" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'paid'::"text"))::boolean) STORED,
    "order" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'order'::"text")) STORED,
    "amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount'::"text"))::bigint) STORED,
    "review" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'review'::"text")) STORED,
    "source" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'source'::"text")) STORED,
    "status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'status'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "dispute" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'dispute'::"text")) STORED,
    "invoice" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'invoice'::"text")) STORED,
    "outcome" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'outcome'::"text")) STORED,
    "refunds" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'refunds'::"text")) STORED,
    "updated" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'updated'::"text"))::integer) STORED,
    "captured" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'captured'::"text"))::boolean) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "customer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "refunded" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'refunded'::"text"))::boolean) STORED,
    "shipping" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'shipping'::"text")) STORED,
    "application" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'application'::"text")) STORED,
    "description" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'description'::"text")) STORED,
    "destination" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'destination'::"text")) STORED,
    "failure_code" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'failure_code'::"text")) STORED,
    "on_behalf_of" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'on_behalf_of'::"text")) STORED,
    "fraud_details" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'fraud_details'::"text")) STORED,
    "receipt_email" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'receipt_email'::"text")) STORED,
    "payment_intent" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_intent'::"text")) STORED,
    "receipt_number" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'receipt_number'::"text")) STORED,
    "transfer_group" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'transfer_group'::"text")) STORED,
    "amount_refunded" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_refunded'::"text"))::bigint) STORED,
    "application_fee" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'application_fee'::"text")) STORED,
    "failure_message" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'failure_message'::"text")) STORED,
    "source_transfer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'source_transfer'::"text")) STORED,
    "balance_transaction" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'balance_transaction'::"text")) STORED,
    "statement_descriptor" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'statement_descriptor'::"text")) STORED,
    "payment_method_details" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'payment_method_details'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."charges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."checkout_session_line_items" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "description" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'description'::"text")) STORED,
    "price" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'price'::"text")) STORED,
    "quantity" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'quantity'::"text"))::integer) STORED,
    "checkout_session" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'checkout_session'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL,
    "amount_discount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_discount'::"text"))::bigint) STORED,
    "amount_subtotal" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_subtotal'::"text"))::bigint) STORED,
    "amount_tax" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_tax'::"text"))::bigint) STORED,
    "amount_total" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_total'::"text"))::bigint) STORED
);


ALTER TABLE "stripe"."checkout_session_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."checkout_sessions" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "adaptive_pricing" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'adaptive_pricing'::"text")) STORED,
    "after_expiration" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'after_expiration'::"text")) STORED,
    "allow_promotion_codes" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'allow_promotion_codes'::"text"))::boolean) STORED,
    "automatic_tax" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'automatic_tax'::"text")) STORED,
    "billing_address_collection" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'billing_address_collection'::"text")) STORED,
    "cancel_url" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'cancel_url'::"text")) STORED,
    "client_reference_id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'client_reference_id'::"text")) STORED,
    "client_secret" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'client_secret'::"text")) STORED,
    "collected_information" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'collected_information'::"text")) STORED,
    "consent" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'consent'::"text")) STORED,
    "consent_collection" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'consent_collection'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "currency_conversion" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'currency_conversion'::"text")) STORED,
    "custom_fields" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'custom_fields'::"text")) STORED,
    "custom_text" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'custom_text'::"text")) STORED,
    "customer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer'::"text")) STORED,
    "customer_creation" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer_creation'::"text")) STORED,
    "customer_details" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'customer_details'::"text")) STORED,
    "customer_email" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer_email'::"text")) STORED,
    "discounts" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'discounts'::"text")) STORED,
    "expires_at" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'expires_at'::"text"))::integer) STORED,
    "invoice" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'invoice'::"text")) STORED,
    "invoice_creation" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'invoice_creation'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "locale" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'locale'::"text")) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "mode" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'mode'::"text")) STORED,
    "optional_items" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'optional_items'::"text")) STORED,
    "payment_intent" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_intent'::"text")) STORED,
    "payment_link" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_link'::"text")) STORED,
    "payment_method_collection" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_method_collection'::"text")) STORED,
    "payment_method_configuration_details" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'payment_method_configuration_details'::"text")) STORED,
    "payment_method_options" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'payment_method_options'::"text")) STORED,
    "payment_method_types" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'payment_method_types'::"text")) STORED,
    "payment_status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_status'::"text")) STORED,
    "permissions" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'permissions'::"text")) STORED,
    "phone_number_collection" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'phone_number_collection'::"text")) STORED,
    "presentment_details" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'presentment_details'::"text")) STORED,
    "recovered_from" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'recovered_from'::"text")) STORED,
    "redirect_on_completion" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'redirect_on_completion'::"text")) STORED,
    "return_url" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'return_url'::"text")) STORED,
    "saved_payment_method_options" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'saved_payment_method_options'::"text")) STORED,
    "setup_intent" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'setup_intent'::"text")) STORED,
    "shipping_address_collection" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'shipping_address_collection'::"text")) STORED,
    "shipping_cost" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'shipping_cost'::"text")) STORED,
    "shipping_details" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'shipping_details'::"text")) STORED,
    "shipping_options" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'shipping_options'::"text")) STORED,
    "status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'status'::"text")) STORED,
    "submit_type" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'submit_type'::"text")) STORED,
    "subscription" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'subscription'::"text")) STORED,
    "success_url" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'success_url'::"text")) STORED,
    "tax_id_collection" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'tax_id_collection'::"text")) STORED,
    "total_details" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'total_details'::"text")) STORED,
    "ui_mode" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'ui_mode'::"text")) STORED,
    "url" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'url'::"text")) STORED,
    "wallet_options" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'wallet_options'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL,
    "amount_subtotal" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_subtotal'::"text"))::bigint) STORED,
    "amount_total" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_total'::"text"))::bigint) STORED
);


ALTER TABLE "stripe"."checkout_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."coupons" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "name" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'name'::"text")) STORED,
    "valid" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'valid'::"text"))::boolean) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "updated" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'updated'::"text"))::integer) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "duration" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'duration'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "redeem_by" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'redeem_by'::"text"))::integer) STORED,
    "amount_off" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_off'::"text"))::bigint) STORED,
    "percent_off" double precision GENERATED ALWAYS AS ((("_raw_data" ->> 'percent_off'::"text"))::double precision) STORED,
    "times_redeemed" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'times_redeemed'::"text"))::bigint) STORED,
    "max_redemptions" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'max_redemptions'::"text"))::bigint) STORED,
    "duration_in_months" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'duration_in_months'::"text"))::bigint) STORED,
    "percent_off_precise" double precision GENERATED ALWAYS AS ((("_raw_data" ->> 'percent_off_precise'::"text"))::double precision) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."credit_notes" (
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "customer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer'::"text")) STORED,
    "customer_balance_transaction" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer_balance_transaction'::"text")) STORED,
    "discount_amounts" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'discount_amounts'::"text")) STORED,
    "invoice" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'invoice'::"text")) STORED,
    "lines" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'lines'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "memo" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'memo'::"text")) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "number" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'number'::"text")) STORED,
    "pdf" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'pdf'::"text")) STORED,
    "reason" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'reason'::"text")) STORED,
    "refund" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'refund'::"text")) STORED,
    "shipping_cost" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'shipping_cost'::"text")) STORED,
    "status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'status'::"text")) STORED,
    "tax_amounts" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'tax_amounts'::"text")) STORED,
    "type" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'type'::"text")) STORED,
    "voided_at" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'voided_at'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL,
    "amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount'::"text"))::bigint) STORED,
    "amount_shipping" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_shipping'::"text"))::bigint) STORED,
    "discount_amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'discount_amount'::"text"))::bigint) STORED,
    "out_of_band_amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'out_of_band_amount'::"text"))::bigint) STORED,
    "subtotal" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'subtotal'::"text"))::bigint) STORED,
    "subtotal_excluding_tax" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'subtotal_excluding_tax'::"text"))::bigint) STORED,
    "total" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'total'::"text"))::bigint) STORED,
    "total_excluding_tax" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'total_excluding_tax'::"text"))::bigint) STORED
);


ALTER TABLE "stripe"."credit_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."customers" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "address" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'address'::"text")) STORED,
    "description" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'description'::"text")) STORED,
    "email" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'email'::"text")) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "name" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'name'::"text")) STORED,
    "phone" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'phone'::"text")) STORED,
    "shipping" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'shipping'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "default_source" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'default_source'::"text")) STORED,
    "delinquent" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'delinquent'::"text"))::boolean) STORED,
    "discount" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'discount'::"text")) STORED,
    "invoice_prefix" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'invoice_prefix'::"text")) STORED,
    "invoice_settings" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'invoice_settings'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "next_invoice_sequence" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'next_invoice_sequence'::"text"))::integer) STORED,
    "preferred_locales" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'preferred_locales'::"text")) STORED,
    "tax_exempt" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'tax_exempt'::"text")) STORED,
    "deleted" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'deleted'::"text"))::boolean) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL,
    "balance" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'balance'::"text"))::bigint) STORED
);


ALTER TABLE "stripe"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."disputes" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount'::"text"))::bigint) STORED,
    "charge" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'charge'::"text")) STORED,
    "reason" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'reason'::"text")) STORED,
    "status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'status'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "updated" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'updated'::"text"))::integer) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "evidence" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'evidence'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "evidence_details" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'evidence_details'::"text")) STORED,
    "balance_transactions" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'balance_transactions'::"text")) STORED,
    "is_charge_refundable" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'is_charge_refundable'::"text"))::boolean) STORED,
    "payment_intent" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_intent'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."disputes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."early_fraud_warnings" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "actionable" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'actionable'::"text"))::boolean) STORED,
    "charge" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'charge'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "fraud_type" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'fraud_type'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "payment_intent" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_intent'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."early_fraud_warnings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."events" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "data" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'data'::"text")) STORED,
    "type" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'type'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "request" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'request'::"text")) STORED,
    "updated" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'updated'::"text"))::integer) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "api_version" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'api_version'::"text")) STORED,
    "pending_webhooks" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'pending_webhooks'::"text"))::bigint) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."exchange_rates_from_usd" (
    "_raw_data" "jsonb" NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone DEFAULT "now"(),
    "_account_id" "text" NOT NULL,
    "date" "date" NOT NULL,
    "sell_currency" "text" NOT NULL,
    "buy_currency_exchange_rates" "text" GENERATED ALWAYS AS (NULLIF(("_raw_data" ->> 'buy_currency_exchange_rates'::"text"), ''::"text")) STORED
);


ALTER TABLE "stripe"."exchange_rates_from_usd" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."features" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "name" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'name'::"text")) STORED,
    "lookup_key" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'lookup_key'::"text")) STORED,
    "active" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'active'::"text"))::boolean) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."invoices" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "auto_advance" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'auto_advance'::"text"))::boolean) STORED,
    "collection_method" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'collection_method'::"text")) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "description" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'description'::"text")) STORED,
    "hosted_invoice_url" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'hosted_invoice_url'::"text")) STORED,
    "lines" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'lines'::"text")) STORED,
    "period_end" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'period_end'::"text"))::integer) STORED,
    "period_start" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'period_start'::"text"))::integer) STORED,
    "status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'status'::"text")) STORED,
    "total" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'total'::"text"))::bigint) STORED,
    "account_country" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'account_country'::"text")) STORED,
    "account_name" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'account_name'::"text")) STORED,
    "account_tax_ids" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'account_tax_ids'::"text")) STORED,
    "amount_due" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_due'::"text"))::bigint) STORED,
    "amount_paid" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_paid'::"text"))::bigint) STORED,
    "amount_remaining" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_remaining'::"text"))::bigint) STORED,
    "application_fee_amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'application_fee_amount'::"text"))::bigint) STORED,
    "attempt_count" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'attempt_count'::"text"))::integer) STORED,
    "attempted" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'attempted'::"text"))::boolean) STORED,
    "billing_reason" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'billing_reason'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "custom_fields" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'custom_fields'::"text")) STORED,
    "customer_address" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'customer_address'::"text")) STORED,
    "customer_email" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer_email'::"text")) STORED,
    "customer_name" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer_name'::"text")) STORED,
    "customer_phone" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer_phone'::"text")) STORED,
    "customer_shipping" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'customer_shipping'::"text")) STORED,
    "customer_tax_exempt" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer_tax_exempt'::"text")) STORED,
    "customer_tax_ids" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'customer_tax_ids'::"text")) STORED,
    "default_tax_rates" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'default_tax_rates'::"text")) STORED,
    "discount" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'discount'::"text")) STORED,
    "discounts" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'discounts'::"text")) STORED,
    "due_date" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'due_date'::"text"))::integer) STORED,
    "footer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'footer'::"text")) STORED,
    "invoice_pdf" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'invoice_pdf'::"text")) STORED,
    "last_finalization_error" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'last_finalization_error'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "next_payment_attempt" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'next_payment_attempt'::"text"))::integer) STORED,
    "number" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'number'::"text")) STORED,
    "paid" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'paid'::"text"))::boolean) STORED,
    "payment_settings" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'payment_settings'::"text")) STORED,
    "receipt_number" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'receipt_number'::"text")) STORED,
    "statement_descriptor" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'statement_descriptor'::"text")) STORED,
    "status_transitions" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'status_transitions'::"text")) STORED,
    "total_discount_amounts" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'total_discount_amounts'::"text")) STORED,
    "total_tax_amounts" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'total_tax_amounts'::"text")) STORED,
    "transfer_data" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'transfer_data'::"text")) STORED,
    "webhooks_delivered_at" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'webhooks_delivered_at'::"text"))::integer) STORED,
    "customer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer'::"text")) STORED,
    "subscription" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'subscription'::"text")) STORED,
    "payment_intent" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_intent'::"text")) STORED,
    "default_payment_method" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'default_payment_method'::"text")) STORED,
    "default_source" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'default_source'::"text")) STORED,
    "on_behalf_of" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'on_behalf_of'::"text")) STORED,
    "charge" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'charge'::"text")) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL,
    "ending_balance" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'ending_balance'::"text"))::bigint) STORED,
    "starting_balance" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'starting_balance'::"text"))::bigint) STORED,
    "subtotal" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'subtotal'::"text"))::bigint) STORED,
    "tax" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'tax'::"text"))::bigint) STORED,
    "post_payment_credit_notes_amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'post_payment_credit_notes_amount'::"text"))::bigint) STORED,
    "pre_payment_credit_notes_amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'pre_payment_credit_notes_amount'::"text"))::bigint) STORED
);


ALTER TABLE "stripe"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."payment_intents" (
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "amount_details" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'amount_details'::"text")) STORED,
    "application" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'application'::"text")) STORED,
    "automatic_payment_methods" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'automatic_payment_methods'::"text")) STORED,
    "canceled_at" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'canceled_at'::"text"))::integer) STORED,
    "cancellation_reason" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'cancellation_reason'::"text")) STORED,
    "capture_method" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'capture_method'::"text")) STORED,
    "client_secret" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'client_secret'::"text")) STORED,
    "confirmation_method" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'confirmation_method'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "customer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer'::"text")) STORED,
    "description" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'description'::"text")) STORED,
    "invoice" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'invoice'::"text")) STORED,
    "last_payment_error" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'last_payment_error'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "next_action" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'next_action'::"text")) STORED,
    "on_behalf_of" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'on_behalf_of'::"text")) STORED,
    "payment_method" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_method'::"text")) STORED,
    "payment_method_options" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'payment_method_options'::"text")) STORED,
    "payment_method_types" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'payment_method_types'::"text")) STORED,
    "processing" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'processing'::"text")) STORED,
    "receipt_email" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'receipt_email'::"text")) STORED,
    "review" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'review'::"text")) STORED,
    "setup_future_usage" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'setup_future_usage'::"text")) STORED,
    "shipping" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'shipping'::"text")) STORED,
    "statement_descriptor" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'statement_descriptor'::"text")) STORED,
    "statement_descriptor_suffix" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'statement_descriptor_suffix'::"text")) STORED,
    "status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'status'::"text")) STORED,
    "transfer_data" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'transfer_data'::"text")) STORED,
    "transfer_group" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'transfer_group'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL,
    "amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount'::"text"))::bigint) STORED,
    "amount_capturable" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_capturable'::"text"))::bigint) STORED,
    "amount_received" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_received'::"text"))::bigint) STORED,
    "application_fee_amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'application_fee_amount'::"text"))::bigint) STORED
);


ALTER TABLE "stripe"."payment_intents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."payment_methods" (
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "customer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer'::"text")) STORED,
    "type" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'type'::"text")) STORED,
    "billing_details" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'billing_details'::"text")) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "card" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'card'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."payouts" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "date" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'date'::"text")) STORED,
    "type" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'type'::"text")) STORED,
    "amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount'::"text"))::bigint) STORED,
    "method" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'method'::"text")) STORED,
    "status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'status'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "updated" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'updated'::"text"))::integer) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "automatic" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'automatic'::"text"))::boolean) STORED,
    "recipient" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'recipient'::"text")) STORED,
    "description" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'description'::"text")) STORED,
    "destination" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'destination'::"text")) STORED,
    "source_type" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'source_type'::"text")) STORED,
    "arrival_date" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'arrival_date'::"text")) STORED,
    "bank_account" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'bank_account'::"text")) STORED,
    "failure_code" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'failure_code'::"text")) STORED,
    "transfer_group" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'transfer_group'::"text")) STORED,
    "amount_reversed" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount_reversed'::"text"))::bigint) STORED,
    "failure_message" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'failure_message'::"text")) STORED,
    "source_transaction" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'source_transaction'::"text")) STORED,
    "balance_transaction" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'balance_transaction'::"text")) STORED,
    "statement_descriptor" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'statement_descriptor'::"text")) STORED,
    "statement_description" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'statement_description'::"text")) STORED,
    "failure_balance_transaction" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'failure_balance_transaction'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."plans" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "name" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'name'::"text")) STORED,
    "tiers" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'tiers'::"text")) STORED,
    "active" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'active'::"text"))::boolean) STORED,
    "amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount'::"text"))::bigint) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "product" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'product'::"text")) STORED,
    "updated" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'updated'::"text"))::integer) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "interval" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'interval'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "nickname" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'nickname'::"text")) STORED,
    "tiers_mode" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'tiers_mode'::"text")) STORED,
    "usage_type" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'usage_type'::"text")) STORED,
    "billing_scheme" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'billing_scheme'::"text")) STORED,
    "interval_count" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'interval_count'::"text"))::bigint) STORED,
    "aggregate_usage" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'aggregate_usage'::"text")) STORED,
    "transform_usage" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'transform_usage'::"text")) STORED,
    "trial_period_days" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'trial_period_days'::"text"))::bigint) STORED,
    "statement_descriptor" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'statement_descriptor'::"text")) STORED,
    "statement_description" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'statement_description'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."prices" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "active" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'active'::"text"))::boolean) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "nickname" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'nickname'::"text")) STORED,
    "recurring" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'recurring'::"text")) STORED,
    "type" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'type'::"text")) STORED,
    "billing_scheme" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'billing_scheme'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "lookup_key" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'lookup_key'::"text")) STORED,
    "tiers_mode" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'tiers_mode'::"text")) STORED,
    "transform_quantity" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'transform_quantity'::"text")) STORED,
    "unit_amount_decimal" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'unit_amount_decimal'::"text")) STORED,
    "product" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'product'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL,
    "unit_amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'unit_amount'::"text"))::bigint) STORED
);


ALTER TABLE "stripe"."prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."products" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "active" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'active'::"text"))::boolean) STORED,
    "default_price" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'default_price'::"text")) STORED,
    "description" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'description'::"text")) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "name" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'name'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "images" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'images'::"text")) STORED,
    "marketing_features" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'marketing_features'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "package_dimensions" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'package_dimensions'::"text")) STORED,
    "shippable" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'shippable'::"text"))::boolean) STORED,
    "statement_descriptor" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'statement_descriptor'::"text")) STORED,
    "unit_label" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'unit_label'::"text")) STORED,
    "updated" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'updated'::"text"))::integer) STORED,
    "url" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'url'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."refunds" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "balance_transaction" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'balance_transaction'::"text")) STORED,
    "charge" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'charge'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "currency" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'currency'::"text")) STORED,
    "destination_details" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'destination_details'::"text")) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "payment_intent" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_intent'::"text")) STORED,
    "reason" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'reason'::"text")) STORED,
    "receipt_number" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'receipt_number'::"text")) STORED,
    "source_transfer_reversal" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'source_transfer_reversal'::"text")) STORED,
    "status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'status'::"text")) STORED,
    "transfer_reversal" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'transfer_reversal'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL,
    "amount" bigint GENERATED ALWAYS AS ((("_raw_data" ->> 'amount'::"text"))::bigint) STORED
);


ALTER TABLE "stripe"."refunds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."reviews" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "billing_zip" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'billing_zip'::"text")) STORED,
    "charge" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'charge'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "closed_reason" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'closed_reason'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "ip_address" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'ip_address'::"text")) STORED,
    "ip_address_location" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'ip_address_location'::"text")) STORED,
    "open" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'open'::"text"))::boolean) STORED,
    "opened_reason" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'opened_reason'::"text")) STORED,
    "payment_intent" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_intent'::"text")) STORED,
    "reason" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'reason'::"text")) STORED,
    "session" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'session'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."setup_intents" (
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "customer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer'::"text")) STORED,
    "description" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'description'::"text")) STORED,
    "payment_method" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'payment_method'::"text")) STORED,
    "status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'status'::"text")) STORED,
    "usage" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'usage'::"text")) STORED,
    "cancellation_reason" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'cancellation_reason'::"text")) STORED,
    "latest_attempt" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'latest_attempt'::"text")) STORED,
    "mandate" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'mandate'::"text")) STORED,
    "single_use_mandate" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'single_use_mandate'::"text")) STORED,
    "on_behalf_of" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'on_behalf_of'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."setup_intents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."subscription_item_change_events_v2_beta" (
    "_raw_data" "jsonb" NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone DEFAULT "now"(),
    "_account_id" "text" NOT NULL,
    "event_timestamp" timestamp with time zone NOT NULL,
    "event_type" "text" NOT NULL,
    "subscription_item_id" "text" NOT NULL,
    "currency" "text" GENERATED ALWAYS AS (NULLIF(("_raw_data" ->> 'currency'::"text"), ''::"text")) STORED,
    "mrr_change" bigint GENERATED ALWAYS AS ((NULLIF(("_raw_data" ->> 'mrr_change'::"text"), ''::"text"))::bigint) STORED,
    "quantity_change" bigint GENERATED ALWAYS AS ((NULLIF(("_raw_data" ->> 'quantity_change'::"text"), ''::"text"))::bigint) STORED,
    "subscription_id" "text" GENERATED ALWAYS AS (NULLIF(("_raw_data" ->> 'subscription_id'::"text"), ''::"text")) STORED,
    "customer_id" "text" GENERATED ALWAYS AS (NULLIF(("_raw_data" ->> 'customer_id'::"text"), ''::"text")) STORED,
    "price_id" "text" GENERATED ALWAYS AS (NULLIF(("_raw_data" ->> 'price_id'::"text"), ''::"text")) STORED,
    "product_id" "text" GENERATED ALWAYS AS (NULLIF(("_raw_data" ->> 'product_id'::"text"), ''::"text")) STORED,
    "local_event_timestamp" "text" GENERATED ALWAYS AS (NULLIF(("_raw_data" ->> 'local_event_timestamp'::"text"), ''::"text")) STORED
);


ALTER TABLE "stripe"."subscription_item_change_events_v2_beta" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."subscription_items" (
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "billing_thresholds" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'billing_thresholds'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "deleted" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'deleted'::"text"))::boolean) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "quantity" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'quantity'::"text"))::integer) STORED,
    "price" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'price'::"text")) STORED,
    "subscription" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'subscription'::"text")) STORED,
    "tax_rates" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'tax_rates'::"text")) STORED,
    "current_period_end" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'current_period_end'::"text"))::integer) STORED,
    "current_period_start" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'current_period_start'::"text"))::integer) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."subscription_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."subscription_schedules" (
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "application" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'application'::"text")) STORED,
    "canceled_at" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'canceled_at'::"text"))::integer) STORED,
    "completed_at" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'completed_at'::"text"))::integer) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "current_phase" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'current_phase'::"text")) STORED,
    "customer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer'::"text")) STORED,
    "default_settings" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'default_settings'::"text")) STORED,
    "end_behavior" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'end_behavior'::"text")) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "phases" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'phases'::"text")) STORED,
    "released_at" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'released_at'::"text"))::integer) STORED,
    "released_subscription" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'released_subscription'::"text")) STORED,
    "status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'status'::"text")) STORED,
    "subscription" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'subscription'::"text")) STORED,
    "test_clock" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'test_clock'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."subscription_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."subscriptions" (
    "_updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "cancel_at_period_end" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'cancel_at_period_end'::"text"))::boolean) STORED,
    "current_period_end" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'current_period_end'::"text"))::integer) STORED,
    "current_period_start" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'current_period_start'::"text"))::integer) STORED,
    "default_payment_method" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'default_payment_method'::"text")) STORED,
    "items" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'items'::"text")) STORED,
    "metadata" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'metadata'::"text")) STORED,
    "pending_setup_intent" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'pending_setup_intent'::"text")) STORED,
    "pending_update" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'pending_update'::"text")) STORED,
    "status" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'status'::"text")) STORED,
    "application_fee_percent" double precision GENERATED ALWAYS AS ((("_raw_data" ->> 'application_fee_percent'::"text"))::double precision) STORED,
    "billing_cycle_anchor" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'billing_cycle_anchor'::"text"))::integer) STORED,
    "billing_thresholds" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'billing_thresholds'::"text")) STORED,
    "cancel_at" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'cancel_at'::"text"))::integer) STORED,
    "canceled_at" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'canceled_at'::"text"))::integer) STORED,
    "collection_method" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'collection_method'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "days_until_due" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'days_until_due'::"text"))::integer) STORED,
    "default_source" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'default_source'::"text")) STORED,
    "default_tax_rates" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'default_tax_rates'::"text")) STORED,
    "discount" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'discount'::"text")) STORED,
    "ended_at" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'ended_at'::"text"))::integer) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "next_pending_invoice_item_invoice" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'next_pending_invoice_item_invoice'::"text"))::integer) STORED,
    "pause_collection" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'pause_collection'::"text")) STORED,
    "pending_invoice_item_interval" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'pending_invoice_item_interval'::"text")) STORED,
    "start_date" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'start_date'::"text"))::integer) STORED,
    "transfer_data" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'transfer_data'::"text")) STORED,
    "trial_end" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'trial_end'::"text")) STORED,
    "trial_start" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'trial_start'::"text")) STORED,
    "schedule" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'schedule'::"text")) STORED,
    "customer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer'::"text")) STORED,
    "latest_invoice" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'latest_invoice'::"text")) STORED,
    "plan" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'plan'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."subscriptions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "stripe"."sync_runs" AS
 SELECT "r"."_account_id" AS "account_id",
    "r"."started_at",
    "r"."closed_at",
    "r"."triggered_by",
    "r"."max_concurrent",
    COALESCE("sum"("o"."processed_count"), (0)::bigint) AS "total_processed",
    "count"("o".*) AS "total_objects",
    "count"(*) FILTER (WHERE ("o"."status" = 'complete'::"text")) AS "complete_count",
    "count"(*) FILTER (WHERE ("o"."status" = 'error'::"text")) AS "error_count",
    "count"(*) FILTER (WHERE ("o"."status" = 'running'::"text")) AS "running_count",
    "count"(*) FILTER (WHERE ("o"."status" = 'pending'::"text")) AS "pending_count",
    "string_agg"("o"."error_message", '; '::"text") FILTER (WHERE ("o"."error_message" IS NOT NULL)) AS "error_message",
        CASE
            WHEN (("r"."closed_at" IS NULL) AND ("count"(*) FILTER (WHERE ("o"."status" = 'running'::"text")) > 0)) THEN 'running'::"text"
            WHEN (("r"."closed_at" IS NULL) AND (("count"("o".*) = 0) OR ("count"("o".*) = "count"(*) FILTER (WHERE ("o"."status" = 'pending'::"text"))))) THEN 'pending'::"text"
            WHEN ("r"."closed_at" IS NULL) THEN 'running'::"text"
            WHEN ("count"(*) FILTER (WHERE ("o"."status" = 'error'::"text")) > 0) THEN 'error'::"text"
            ELSE 'complete'::"text"
        END AS "status"
   FROM ("stripe"."_sync_runs" "r"
     LEFT JOIN "stripe"."_sync_obj_runs" "o" ON ((("o"."_account_id" = "r"."_account_id") AND ("o"."run_started_at" = "r"."started_at"))))
  GROUP BY "r"."_account_id", "r"."started_at", "r"."closed_at", "r"."triggered_by", "r"."max_concurrent";


ALTER VIEW "stripe"."sync_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "stripe"."tax_ids" (
    "_last_synced_at" timestamp with time zone,
    "_raw_data" "jsonb",
    "_account_id" "text" NOT NULL,
    "object" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'object'::"text")) STORED,
    "country" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'country'::"text")) STORED,
    "customer" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'customer'::"text")) STORED,
    "type" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'type'::"text")) STORED,
    "value" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'value'::"text")) STORED,
    "created" integer GENERATED ALWAYS AS ((("_raw_data" ->> 'created'::"text"))::integer) STORED,
    "livemode" boolean GENERATED ALWAYS AS ((("_raw_data" ->> 'livemode'::"text"))::boolean) STORED,
    "owner" "jsonb" GENERATED ALWAYS AS (("_raw_data" -> 'owner'::"text")) STORED,
    "id" "text" GENERATED ALWAYS AS (("_raw_data" ->> 'id'::"text")) STORED NOT NULL
);


ALTER TABLE "stripe"."tax_ids" OWNER TO "postgres";


ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_exercise_mappings"
    ADD CONSTRAINT "canonical_exercise_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."canonical_exercise_mappings"
    ADD CONSTRAINT "canonical_exercise_mappings_source_external_exercise_id_key" UNIQUE ("source", "external_exercise_id");



ALTER TABLE ONLY "public"."canonical_exercises"
    ADD CONSTRAINT "canonical_exercises_normalized_title_key" UNIQUE ("normalized_title");



ALTER TABLE ONLY "public"."canonical_exercises"
    ADD CONSTRAINT "canonical_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_history"
    ADD CONSTRAINT "chat_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_usage_limits"
    ADD CONSTRAINT "feature_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_usage"
    ADD CONSTRAINT "feature_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_usage"
    ADD CONSTRAINT "feature_usage_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hevy_exercise_templates"
    ADD CONSTRAINT "hevy_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hevy_workouts_count"
    ADD CONSTRAINT "hevy_workouts_count_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hevy_workouts_count"
    ADD CONSTRAINT "hevy_workouts_count_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."onboarding_emails"
    ADD CONSTRAINT "onboarding_emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_survey"
    ADD CONSTRAINT "onboarding_survey_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."onboarding_survey"
    ADD CONSTRAINT "onboarding_survey_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."policy_versions"
    ADD CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_history"
    ADD CONSTRAINT "program_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_schedule_history"
    ADD CONSTRAINT "program_schedule_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_subscribers"
    ADD CONSTRAINT "program_subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_workout_exercises_history"
    ADD CONSTRAINT "program_workout_exercises_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_workout_exercises"
    ADD CONSTRAINT "program_workout_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_new_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_workout_exercises"
    ADD CONSTRAINT "saved_workout_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_workouts"
    ADD CONSTRAINT "saved_workouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_workouts"
    ADD CONSTRAINT "schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_users"
    ADD CONSTRAINT "test_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trending"
    ADD CONSTRAINT "trending_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trending"
    ADD CONSTRAINT "trending_title_espanol_key" UNIQUE ("title_espanol");



ALTER TABLE ONLY "public"."trending"
    ADD CONSTRAINT "trending_title_francais_key" UNIQUE ("title_francais");



ALTER TABLE ONLY "public"."trending"
    ADD CONSTRAINT "trending_title_key" UNIQUE ("title_english");



ALTER TABLE ONLY "public"."trending"
    ADD CONSTRAINT "trending_title_portugues_key" UNIQUE ("title_portugues");



ALTER TABLE ONLY "public"."user_consents"
    ADD CONSTRAINT "user_consents_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_exercise_id_key" UNIQUE ("workout_exercise_id", "set_index");



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_workout_id_key" UNIQUE ("workout_id", "sort_order");



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_history_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workout_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_user_source_external_id_key" UNIQUE ("user_id", "source", "external_id");



ALTER TABLE ONLY "stripe"."_migrations"
    ADD CONSTRAINT "_migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "stripe"."_migrations"
    ADD CONSTRAINT "_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."_sync_obj_runs"
    ADD CONSTRAINT "_sync_obj_run_pkey" PRIMARY KEY ("_account_id", "run_started_at", "object");



ALTER TABLE ONLY "stripe"."_sync_runs"
    ADD CONSTRAINT "_sync_run_pkey" PRIMARY KEY ("_account_id", "started_at");



ALTER TABLE ONLY "stripe"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."active_entitlements"
    ADD CONSTRAINT "active_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."charges"
    ADD CONSTRAINT "charges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."checkout_session_line_items"
    ADD CONSTRAINT "checkout_session_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."credit_notes"
    ADD CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."disputes"
    ADD CONSTRAINT "disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."early_fraud_warnings"
    ADD CONSTRAINT "early_fraud_warnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."exchange_rates_from_usd"
    ADD CONSTRAINT "exchange_rates_from_usd_pkey" PRIMARY KEY ("_account_id", "date", "sell_currency");



ALTER TABLE ONLY "stripe"."features"
    ADD CONSTRAINT "features_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."_managed_webhooks"
    ADD CONSTRAINT "managed_webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."_managed_webhooks"
    ADD CONSTRAINT "managed_webhooks_url_account_unique" UNIQUE ("url", "account_id");



ALTER TABLE ONLY "stripe"."_sync_runs"
    ADD CONSTRAINT "one_active_run_per_account" EXCLUDE USING "btree" ("_account_id" WITH =) WHERE (("closed_at" IS NULL));



ALTER TABLE ONLY "stripe"."payment_intents"
    ADD CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."prices"
    ADD CONSTRAINT "prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."refunds"
    ADD CONSTRAINT "refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."setup_intents"
    ADD CONSTRAINT "setup_intents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."subscription_item_change_events_v2_beta"
    ADD CONSTRAINT "subscription_item_change_events_v2_beta_pkey" PRIMARY KEY ("_account_id", "event_timestamp", "event_type", "subscription_item_id");



ALTER TABLE ONLY "stripe"."subscription_items"
    ADD CONSTRAINT "subscription_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."subscription_schedules"
    ADD CONSTRAINT "subscription_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "stripe"."tax_ids"
    ADD CONSTRAINT "tax_ids_pkey" PRIMARY KEY ("id");



CREATE INDEX "blocked_users_blocked_id_idx" ON "public"."blocked_users" USING "btree" ("blocked_id");



CREATE INDEX "blocked_users_user_id_idx" ON "public"."blocked_users" USING "btree" ("user_id");



CREATE INDEX "followers_follower_id_idx" ON "public"."followers" USING "btree" ("follower_id");



CREATE INDEX "followers_following_id_idx" ON "public"."followers" USING "btree" ("following_id");



CREATE INDEX "idx_program_subscribers_user_id" ON "public"."program_subscribers" USING "btree" ("user_id");



CREATE INDEX "idx_programs_explore_saves" ON "public"."programs" USING "btree" ("explore", "saves" DESC);



CREATE INDEX "idx_saved_workouts_user_id" ON "public"."saved_workouts" USING "btree" ("user_id");



CREATE INDEX "idx_users_timezone" ON "public"."users" USING "btree" ("timezone");



CREATE INDEX "onboarding_emails_user_id_idx" ON "public"."onboarding_emails" USING "btree" ("user_id");



CREATE INDEX "personal_records_exercise_id_idx" ON "public"."personal_records" USING "btree" ("exercise_id");



CREATE INDEX "personal_records_user_id_idx" ON "public"."personal_records" USING "btree" ("user_id");



CREATE INDEX "policy_versions_document_type_effective_at_idx" ON "public"."policy_versions" USING "btree" ("document_type", "effective_at" DESC);



CREATE INDEX "program_history_user_id_idx" ON "public"."program_history" USING "btree" ("user_id");



CREATE INDEX "program_schedule_history_program_history_id_idx" ON "public"."program_schedule_history" USING "btree" ("program_history_id");



CREATE INDEX "program_schedule_history_user_id_idx" ON "public"."program_schedule_history" USING "btree" ("user_id");



CREATE INDEX "program_workout_exercises_exercise_id_idx" ON "public"."program_workout_exercises" USING "btree" ("old_exercise_id");



CREATE INDEX "program_workout_exercises_histo_program_schedule_history_id_idx" ON "public"."program_workout_exercises_history" USING "btree" ("program_schedule_history_id");



CREATE INDEX "program_workout_exercises_history_exercise_id_idx" ON "public"."program_workout_exercises_history" USING "btree" ("old_exercise_id");



CREATE INDEX "program_workout_exercises_history_user_id_idx" ON "public"."program_workout_exercises_history" USING "btree" ("user_id");



CREATE INDEX "program_workout_exercises_schedule_id_idx" ON "public"."program_workout_exercises" USING "btree" ("schedule_id");



CREATE INDEX "programs_user_id_idx" ON "public"."programs" USING "btree" ("user_id");



CREATE INDEX "reports_user_id_idx" ON "public"."reports" USING "btree" ("user_id");



CREATE INDEX "saved_workout_exercises_exercise_id_idx" ON "public"."saved_workout_exercises" USING "btree" ("old_exercise_id");



CREATE INDEX "saved_workout_exercises_saved_workout_id_idx" ON "public"."saved_workout_exercises" USING "btree" ("saved_workout_id");



CREATE INDEX "workout_history_user_id_idx" ON "public"."workouts" USING "btree" ("user_id");



CREATE INDEX "workouts_user_id_started_at_idx" ON "public"."workouts" USING "btree" ("user_id", "started_at" DESC);



CREATE UNIQUE INDEX "active_entitlements_lookup_key_key" ON "stripe"."active_entitlements" USING "btree" ("lookup_key") WHERE ("lookup_key" IS NOT NULL);



CREATE UNIQUE INDEX "features_lookup_key_key" ON "stripe"."features" USING "btree" ("lookup_key") WHERE ("lookup_key" IS NOT NULL);



CREATE INDEX "idx_accounts_api_key_hashes" ON "stripe"."accounts" USING "gin" ("api_key_hashes");



CREATE INDEX "idx_accounts_business_name" ON "stripe"."accounts" USING "btree" ("business_name");



CREATE INDEX "idx_exchange_rates_from_usd_date" ON "stripe"."exchange_rates_from_usd" USING "btree" ("date");



CREATE INDEX "idx_exchange_rates_from_usd_sell_currency" ON "stripe"."exchange_rates_from_usd" USING "btree" ("sell_currency");



CREATE INDEX "idx_sync_obj_runs_status" ON "stripe"."_sync_obj_runs" USING "btree" ("_account_id", "run_started_at", "status");



CREATE INDEX "idx_sync_runs_account_status" ON "stripe"."_sync_runs" USING "btree" ("_account_id", "closed_at");



CREATE INDEX "stripe_active_entitlements_customer_idx" ON "stripe"."active_entitlements" USING "btree" ("customer");



CREATE INDEX "stripe_active_entitlements_feature_idx" ON "stripe"."active_entitlements" USING "btree" ("feature");



CREATE INDEX "stripe_checkout_session_line_items_price_idx" ON "stripe"."checkout_session_line_items" USING "btree" ("price");



CREATE INDEX "stripe_checkout_session_line_items_session_idx" ON "stripe"."checkout_session_line_items" USING "btree" ("checkout_session");



CREATE INDEX "stripe_checkout_sessions_customer_idx" ON "stripe"."checkout_sessions" USING "btree" ("customer");



CREATE INDEX "stripe_checkout_sessions_invoice_idx" ON "stripe"."checkout_sessions" USING "btree" ("invoice");



CREATE INDEX "stripe_checkout_sessions_payment_intent_idx" ON "stripe"."checkout_sessions" USING "btree" ("payment_intent");



CREATE INDEX "stripe_checkout_sessions_subscription_idx" ON "stripe"."checkout_sessions" USING "btree" ("subscription");



CREATE INDEX "stripe_credit_notes_customer_idx" ON "stripe"."credit_notes" USING "btree" ("customer");



CREATE INDEX "stripe_credit_notes_invoice_idx" ON "stripe"."credit_notes" USING "btree" ("invoice");



CREATE INDEX "stripe_dispute_created_idx" ON "stripe"."disputes" USING "btree" ("created");



CREATE INDEX "stripe_early_fraud_warnings_charge_idx" ON "stripe"."early_fraud_warnings" USING "btree" ("charge");



CREATE INDEX "stripe_early_fraud_warnings_payment_intent_idx" ON "stripe"."early_fraud_warnings" USING "btree" ("payment_intent");



CREATE INDEX "stripe_invoices_customer_idx" ON "stripe"."invoices" USING "btree" ("customer");



CREATE INDEX "stripe_invoices_subscription_idx" ON "stripe"."invoices" USING "btree" ("subscription");



CREATE INDEX "stripe_managed_webhooks_enabled_idx" ON "stripe"."_managed_webhooks" USING "btree" ("enabled");



CREATE INDEX "stripe_managed_webhooks_status_idx" ON "stripe"."_managed_webhooks" USING "btree" ("status");



CREATE INDEX "stripe_payment_intents_customer_idx" ON "stripe"."payment_intents" USING "btree" ("customer");



CREATE INDEX "stripe_payment_intents_invoice_idx" ON "stripe"."payment_intents" USING "btree" ("invoice");



CREATE INDEX "stripe_payment_methods_customer_idx" ON "stripe"."payment_methods" USING "btree" ("customer");



CREATE INDEX "stripe_refunds_charge_idx" ON "stripe"."refunds" USING "btree" ("charge");



CREATE INDEX "stripe_refunds_payment_intent_idx" ON "stripe"."refunds" USING "btree" ("payment_intent");



CREATE INDEX "stripe_reviews_charge_idx" ON "stripe"."reviews" USING "btree" ("charge");



CREATE INDEX "stripe_reviews_payment_intent_idx" ON "stripe"."reviews" USING "btree" ("payment_intent");



CREATE INDEX "stripe_setup_intents_customer_idx" ON "stripe"."setup_intents" USING "btree" ("customer");



CREATE INDEX "stripe_tax_ids_customer_idx" ON "stripe"."tax_ids" USING "btree" ("customer");



CREATE OR REPLACE TRIGGER "programs_tsvectorupdate_trigger" BEFORE INSERT OR UPDATE ON "public"."programs" FOR EACH ROW EXECUTE FUNCTION "public"."programs_tsvector_update"();



CREATE OR REPLACE TRIGGER "resend-general-add-contact" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('https://oivloxjpauqrggayaovk.supabase.co/functions/v1/resend-add-contact', 'POST', '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pdmxveGpwYXVxcmdnYXlhb3ZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4Njg2NjY5MywiZXhwIjoyMDAyNDQyNjkzfQ.r-DSZ570oZ40D_N_nBDWBr5dcoiWrC1t_3OEjl6gQng"}', '{}', '5000');



CREATE OR REPLACE TRIGGER "trigger_increment_saves" AFTER INSERT ON "public"."program_subscribers" FOR EACH ROW EXECUTE FUNCTION "public"."increment_program_saves"();



CREATE OR REPLACE TRIGGER "trigger_user_onboarding_emails" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_add_user_onboarding_emails"();



CREATE OR REPLACE TRIGGER "tsvectorupdate" BEFORE INSERT OR UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."users_tsvector_update"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."_managed_webhooks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_metadata"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."_sync_obj_runs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_metadata"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."_sync_runs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_metadata"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."active_entitlements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."charges" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."checkout_session_line_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."checkout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."coupons" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."disputes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."early_fraud_warnings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."exchange_rates_from_usd" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."features" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."payouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."plans" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."prices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."refunds" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."subscription_item_change_events_v2_beta" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "stripe"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."chat_history"
    ADD CONSTRAINT "chat_history_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_history"
    ADD CONSTRAINT "chat_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feature_usage"
    ADD CONSTRAINT "feature_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hevy_workouts_count"
    ADD CONSTRAINT "hevy_workouts_count_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."onboarding_emails"
    ADD CONSTRAINT "onboarding_emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."onboarding_survey"
    ADD CONSTRAINT "onboarding_survey_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_history"
    ADD CONSTRAINT "program_history_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."program_history"
    ADD CONSTRAINT "program_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."program_schedule_history"
    ADD CONSTRAINT "program_schedule_history_program_history_id_fkey" FOREIGN KEY ("program_history_id") REFERENCES "public"."program_history"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_schedule_history"
    ADD CONSTRAINT "program_schedule_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."program_subscribers"
    ADD CONSTRAINT "program_subscribers_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."program_subscribers"
    ADD CONSTRAINT "program_subscribers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_workout_exercises"
    ADD CONSTRAINT "program_workout_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."hevy_exercise_templates"("id");



ALTER TABLE ONLY "public"."program_workout_exercises_history"
    ADD CONSTRAINT "program_workout_exercises_hist_program_schedule_history_id_fkey" FOREIGN KEY ("program_schedule_history_id") REFERENCES "public"."program_schedule_history"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_workout_exercises_history"
    ADD CONSTRAINT "program_workout_exercises_history_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."hevy_exercise_templates"("id");



ALTER TABLE ONLY "public"."program_workout_exercises_history"
    ADD CONSTRAINT "program_workout_exercises_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."program_workout_exercises"
    ADD CONSTRAINT "program_workout_exercises_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedule_workouts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."saved_workout_exercises"
    ADD CONSTRAINT "saved_workout_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."hevy_exercise_templates"("id");



ALTER TABLE ONLY "public"."saved_workout_exercises"
    ADD CONSTRAINT "saved_workout_exercises_saved_workout_id_fkey" FOREIGN KEY ("saved_workout_id") REFERENCES "public"."saved_workouts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_workouts"
    ADD CONSTRAINT "saved_workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_workouts"
    ADD CONSTRAINT "schedule_workouts_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."test_users"
    ADD CONSTRAINT "test_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_consents"
    ADD CONSTRAINT "user_consents_privacy_version_id_fkey" FOREIGN KEY ("privacy_version_id") REFERENCES "public"."policy_versions"("id");



ALTER TABLE ONLY "public"."user_consents"
    ADD CONSTRAINT "user_consents_terms_version_id_fkey" FOREIGN KEY ("terms_version_id") REFERENCES "public"."policy_versions"("id");



ALTER TABLE ONLY "public"."user_consents"
    ADD CONSTRAINT "user_consents_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_canonical_exercise_id_fkey" FOREIGN KEY ("canonical_exercise_id") REFERENCES "public"."canonical_exercises"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workout_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_workout_exercise_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "public"."workout_exercises"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "stripe"."active_entitlements"
    ADD CONSTRAINT "fk_active_entitlements_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."charges"
    ADD CONSTRAINT "fk_charges_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."checkout_session_line_items"
    ADD CONSTRAINT "fk_checkout_session_line_items_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."checkout_sessions"
    ADD CONSTRAINT "fk_checkout_sessions_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."credit_notes"
    ADD CONSTRAINT "fk_credit_notes_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."customers"
    ADD CONSTRAINT "fk_customers_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."disputes"
    ADD CONSTRAINT "fk_disputes_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."early_fraud_warnings"
    ADD CONSTRAINT "fk_early_fraud_warnings_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."exchange_rates_from_usd"
    ADD CONSTRAINT "fk_exchange_rates_from_usd_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."features"
    ADD CONSTRAINT "fk_features_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."invoices"
    ADD CONSTRAINT "fk_invoices_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."_managed_webhooks"
    ADD CONSTRAINT "fk_managed_webhooks_account" FOREIGN KEY ("account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."payment_intents"
    ADD CONSTRAINT "fk_payment_intents_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."payment_methods"
    ADD CONSTRAINT "fk_payment_methods_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."plans"
    ADD CONSTRAINT "fk_plans_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."prices"
    ADD CONSTRAINT "fk_prices_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."products"
    ADD CONSTRAINT "fk_products_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."refunds"
    ADD CONSTRAINT "fk_refunds_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."reviews"
    ADD CONSTRAINT "fk_reviews_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."setup_intents"
    ADD CONSTRAINT "fk_setup_intents_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."subscription_item_change_events_v2_beta"
    ADD CONSTRAINT "fk_subscription_item_change_events_v2_beta_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."subscription_items"
    ADD CONSTRAINT "fk_subscription_items_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."subscription_schedules"
    ADD CONSTRAINT "fk_subscription_schedules_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."subscriptions"
    ADD CONSTRAINT "fk_subscriptions_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."_sync_obj_runs"
    ADD CONSTRAINT "fk_sync_obj_runs_parent" FOREIGN KEY ("_account_id", "run_started_at") REFERENCES "stripe"."_sync_runs"("_account_id", "started_at");



ALTER TABLE ONLY "stripe"."_sync_runs"
    ADD CONSTRAINT "fk_sync_run_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



ALTER TABLE ONLY "stripe"."tax_ids"
    ADD CONSTRAINT "fk_tax_ids_account" FOREIGN KEY ("_account_id") REFERENCES "stripe"."accounts"("id");



CREATE POLICY "Allow user to update own workout count" ON "public"."hevy_workouts_count" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Anyone can read canonical exercise mappings" ON "public"."canonical_exercise_mappings" FOR SELECT USING (true);



CREATE POLICY "Anyone can read canonical exercises" ON "public"."canonical_exercises" FOR SELECT USING (true);



CREATE POLICY "Anyone can submit feedback" ON "public"."feedback" FOR INSERT TO "anon", "authenticated" WITH CHECK ((("feedback" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "feedback")) > 0)));



CREATE POLICY "Authenticated can insert canonical exercise mappings" ON "public"."canonical_exercise_mappings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated can insert canonical exercises" ON "public"."canonical_exercises" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can read policy versions" ON "public"."policy_versions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable delete for authenticated users only" ON "public"."followers" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."blocked_users" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."chat_history" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."onboarding_survey" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."program_subscribers" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."programs" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."saved_workouts" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable delete for users if authenticated" ON "public"."personal_records" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable insert" ON "public"."program_workout_exercises" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for all public roles" ON "public"."schedule_workouts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for all users" ON "public"."programs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."blocked_users" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."followers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."hevy_workouts_count" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."onboarding_survey" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."personal_records" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."program_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."program_schedule_history" FOR INSERT TO "authenticated", "service_role" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."program_subscribers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."program_workout_exercises_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."reports" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."saved_workout_exercises" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."saved_workouts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for users based on user_id" ON "public"."chat_history" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."blocked_users" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."feedback" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."followers" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."hevy_exercise_templates" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."personal_records" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."product_usage_limits" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."program_history" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."program_schedule_history" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."program_subscribers" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."program_workout_exercises" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."program_workout_exercises_history" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."programs" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."saved_workouts" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."schedule_workouts" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."trending" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."users" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."saved_workout_exercises" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for users own count" ON "public"."hevy_workouts_count" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable update for authenticated users only" ON "public"."personal_records" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Enable update for authenticated users only" ON "public"."saved_workout_exercises" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Enable update for authenticated users only" ON "public"."saved_workouts" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text")) WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'authenticated'::"text"));



CREATE POLICY "Enable update for users" ON "public"."programs" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for users based on email" ON "public"."users" FOR UPDATE USING (((( SELECT "auth"."jwt"() AS "jwt") ->> 'email'::"text") = "email")) WITH CHECK (((( SELECT "auth"."jwt"() AS "jwt") ->> 'email'::"text") = "email"));



CREATE POLICY "Enable update for users based on user_id" ON "public"."onboarding_emails" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."chat_history" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."feature_usage" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."onboarding_emails" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."onboarding_survey" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."test_users" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Policy with table joins" ON "public"."program_workout_exercises_history" FOR UPDATE USING (true);



CREATE POLICY "Users can insert own consents" ON "public"."user_consents" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can read own consents" ON "public"."user_consents" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own consents" ON "public"."user_consents" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users delete own workout exercises" ON "public"."workout_exercises" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users delete own workout sets" ON "public"."workout_sets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workouts" "w" ON (("w"."id" = "we"."workout_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users delete own workouts" ON "public"."workouts" FOR DELETE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users insert own workout exercises" ON "public"."workout_exercises" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users insert own workout sets" ON "public"."workout_sets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workouts" "w" ON (("w"."id" = "we"."workout_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users insert own workouts" ON "public"."workouts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users select own workout exercises" ON "public"."workout_exercises" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users select own workout sets" ON "public"."workout_sets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workouts" "w" ON (("w"."id" = "we"."workout_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users select own workouts" ON "public"."workouts" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users update own workout exercises" ON "public"."workout_exercises" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users update own workout sets" ON "public"."workout_sets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workouts" "w" ON (("w"."id" = "we"."workout_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workouts" "w" ON (("w"."id" = "we"."workout_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND ("w"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users update own workouts" ON "public"."workouts" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."blocked_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_exercise_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."canonical_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chat_history_update_own" ON "public"."chat_history" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."feature_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."followers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hevy_exercise_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hevy_workouts_count" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_emails" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."onboarding_survey" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."policy_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_usage_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."program_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."program_schedule_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."program_subscribers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."program_workout_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."program_workout_exercises_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."programs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_workout_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_workouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_workouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."test_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trending" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_consents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workout_sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "postgres";




























































































































































































































































































































































GRANT ALL ON FUNCTION "public"."delete_secret"("secret_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_secret"("secret_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_secret"("secret_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_bolao_predictor_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_bolao_predictor_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_bolao_predictor_limits"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_hevy_key_from_vault"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_hevy_key_from_vault"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_feature_limits"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_feature_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_feature_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_feature_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_add_user_onboarding_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_add_user_onboarding_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_add_user_onboarding_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_delete_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_delete_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_delete_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_feature_usage"("p_feature" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_feature_usage"("p_feature" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_feature_usage"("p_feature" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_program_saves"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_program_saves"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_program_saves"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_secret"("secret" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_secret"("secret" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_secret"("secret" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."programs_tsvector_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."programs_tsvector_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."programs_tsvector_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."read_secret"("secret_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."read_secret"("secret_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."read_secret"("secret_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."revise_backed_up_workout"("p_workout_id" "uuid", "p_title" "text", "p_description" "text", "p_started_at" timestamp with time zone, "p_ended_at" timestamp with time zone, "p_source_updated_at" timestamp with time zone, "p_exercises" "jsonb", "p_sets" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."revise_backed_up_workout"("p_workout_id" "uuid", "p_title" "text", "p_description" "text", "p_started_at" timestamp with time zone, "p_ended_at" timestamp with time zone, "p_source_updated_at" timestamp with time zone, "p_exercises" "jsonb", "p_sets" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revise_backed_up_workout"("p_workout_id" "uuid", "p_title" "text", "p_description" "text", "p_started_at" timestamp with time zone, "p_ended_at" timestamp with time zone, "p_source_updated_at" timestamp with time zone, "p_exercises" "jsonb", "p_sets" "jsonb") TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."programs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."programs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."programs" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_programs_by_prefix"("prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_programs_by_prefix"("prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_programs_by_prefix"("prefix" "text") TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."users" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_users_by_prefix"("prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_users_by_prefix"("prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_users_by_prefix"("prefix" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_all_users_hevy_program_sync"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_all_users_hevy_program_sync"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_all_users_hevy_program_sync"() TO "service_role";



GRANT ALL ON FUNCTION "public"."try_consume_bolao_prediction"() TO "anon";
GRANT ALL ON FUNCTION "public"."try_consume_bolao_prediction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."try_consume_bolao_prediction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."users_tsvector_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."users_tsvector_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."users_tsvector_update"() TO "service_role";

































GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."blocked_users" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."blocked_users" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."blocked_users" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."canonical_exercise_mappings" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."canonical_exercise_mappings" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."canonical_exercise_mappings" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."canonical_exercises" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."canonical_exercises" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."canonical_exercises" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."chat_history" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."chat_history" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."chat_history" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."feature_usage" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."feature_usage" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."feature_usage" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."feedback" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."feedback" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."feedback" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."followers" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."followers" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."followers" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."hevy_exercise_templates" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."hevy_exercise_templates" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."hevy_exercise_templates" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."hevy_workouts_count" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."hevy_workouts_count" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."hevy_workouts_count" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."onboarding_emails" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."onboarding_emails" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."onboarding_emails" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."onboarding_survey" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."onboarding_survey" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."onboarding_survey" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."personal_records" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."personal_records" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."personal_records" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."policy_versions" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."policy_versions" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."policy_versions" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_usage_limits" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_usage_limits" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."product_usage_limits" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_history" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_history" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_history" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_schedule_history" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_schedule_history" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_schedule_history" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_subscribers" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_subscribers" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_subscribers" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_workout_exercises" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_workout_exercises" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_workout_exercises" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_workout_exercises_history" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_workout_exercises_history" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."program_workout_exercises_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."programs_new_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."programs_new_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."programs_new_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reports" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reports" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."reports" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."saved_workout_exercises" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."saved_workout_exercises" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."saved_workout_exercises" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."saved_workouts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."saved_workouts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."saved_workouts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."schedule_workouts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."schedule_workouts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."schedule_workouts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."test_users" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."test_users" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."test_users" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trending" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trending" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trending" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_consents" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_consents" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."user_consents" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."workout_exercises" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."workout_exercises" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."workout_exercises" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."workout_sets" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."workout_sets" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."workout_sets" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."workouts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."workouts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."workouts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";































