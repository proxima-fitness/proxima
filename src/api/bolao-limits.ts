/**
 * Client-side bolao predictor daily limits.
 *
 * Depends on: ./index, ./feature-limits, lib/bolao-limits
 * Used by: hooks.ts, BolaoPredictorForm
 */
import type { User } from "@supabase/supabase-js";
import { supabase } from ".";
import { isTestUser } from "./feature-limits";
import {
    mapBolaoPredictorLimitsRow,
    unlimitedBolaoPredictorLimits,
    type TBolaoPredictorLimits,
} from "@/lib/bolao-limits";

export async function getBolaoPredictorLimits(
    user: User | undefined | null,
): Promise<TBolaoPredictorLimits | null> {
    if (!user) return null;
    if (isTestUser(user)) return unlimitedBolaoPredictorLimits();

    try {
        const { data, error } = await supabase.rpc("get_bolao_predictor_limits");
        if (error) {
            console.error("Error fetching bolao predictor limits", error);
            return null;
        }

        return mapBolaoPredictorLimitsRow(data?.[0]);
    } catch (err) {
        console.error("Error fetching bolao predictor limits", err);
        return null;
    }
}
