/**
 * Server-side feature limits with test-user tier override (cookie-backed).
 *
 * Client QA overrides live in localStorage and are mirrored to a cookie via
 * `syncTestTierOverrideToCookie` in api/feature-limits.ts.
 *
 * Depends on: api/feature-limits, next/headers, @supabase/supabase-js
 * Used by: /api/chat, /api/hevy/exercise-history
 */
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
    TEST_TIER_OVERRIDE_KEY,
    applyTestTierOverrideToLimits,
    isTestUser,
    parseTestTierOverride,
} from "@/api/feature-limits";

export async function getServerMyFeatureLimits(
    supabase: SupabaseClient,
    user: User | null | undefined,
): Promise<TFeatureLimits | null> {
    if (!user) return null;

    const { data, error } = await supabase.rpc("get_my_feature_limits");
    if (error || !data?.[0]) {
        return null;
    }

    const row = data[0] as TFeatureLimits;
    if (!isTestUser(user)) return row;

    const cookieStore = await cookies();
    const override = parseTestTierOverride(cookieStore.get(TEST_TIER_OVERRIDE_KEY)?.value);
    if (!override) return row;

    return applyTestTierOverrideToLimits(row, override);
}

export async function getServerHasActiveSubscription(
    supabase: SupabaseClient,
    user: User | null | undefined,
): Promise<boolean> {
    const limits = await getServerMyFeatureLimits(supabase, user);
    return Boolean(limits?.has_active_subscription);
}
