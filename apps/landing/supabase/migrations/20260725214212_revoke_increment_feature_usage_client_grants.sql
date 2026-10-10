-- ADR 0019: stop browser clients from using the uncapped increment shim.
-- Metered writes go through try_consume_feature_usage. Keep the function for
-- one release (service_role / ops) but revoke anon + authenticated EXECUTE.

REVOKE ALL ON FUNCTION "public"."increment_feature_usage"("p_feature" "text") FROM "anon";
REVOKE ALL ON FUNCTION "public"."increment_feature_usage"("p_feature" "text") FROM "authenticated";
GRANT ALL ON FUNCTION "public"."increment_feature_usage"("p_feature" "text") TO "service_role";
