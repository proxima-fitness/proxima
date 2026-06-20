/**
 * Server-side bolao predictor daily limits.
 *
 * Depends on: api/feature-limits, lib/bolao-limits, @supabase/supabase-js
 * Used by: /api/bolao-predictor
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isTestUser } from "@/api/feature-limits";
import {
    mapBolaoConsumeRow,
    mapBolaoPredictorLimitsRow,
    unlimitedBolaoPredictorLimits,
    type TBolaoPredictorLimits,
} from "@/lib/bolao-limits";

export async function getServerBolaoPredictorLimits(
    supabase: SupabaseClient,
    user: User | null | undefined,
): Promise<TBolaoPredictorLimits | null> {
    if (!user) return null;
    if (isTestUser(user)) return unlimitedBolaoPredictorLimits();

    const { data, error } = await supabase.rpc("get_bolao_predictor_limits");
    if (error) {
        console.error("Error fetching bolao predictor limits", error);
        return null;
    }

    return mapBolaoPredictorLimitsRow(data?.[0]);
}

export async function consumeBolaoPrediction(
    supabase: SupabaseClient,
    user: User | null | undefined,
): Promise<{ allowed: boolean; error: Error | null }> {
    if (!user) {
        return { allowed: false, error: new Error("Unauthorized") };
    }

    if (isTestUser(user)) {
        return { allowed: true, error: null };
    }

    try {
        const { data, error } = await supabase.rpc("try_consume_bolao_prediction");
        if (error) {
            console.error("Error consuming bolao prediction", error);
            return { allowed: false, error: new Error(error.message) };
        }

        return { allowed: mapBolaoConsumeRow(data?.[0]), error: null };
    } catch (err) {
        console.error("Error consuming bolao prediction", err);
        return {
            allowed: false,
            error: err instanceof Error ? err : new Error(String(err)),
        };
    }
}
