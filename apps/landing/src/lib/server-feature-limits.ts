/**
 * Server-side feature limits with test-user tier override (cookie-backed).
 *
 * Client QA overrides live in localStorage and are mirrored to a cookie via
 * `syncTestTierOverrideToCookie` in api/feature-limits.ts.
 *
 * LLM metering for authenticated chat: `tryConsumeMonthlyLlmRequest` (ADR 0019).
 * Paywall shape: HTTP 402 + `{ error: "usage_cap", feature: "monthly_llm_requests", resets_on? }`.
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
import { USAGE_CAP_ERROR, type TUsageCapFeature } from "@/lib/usage-cap";

export { USAGE_CAP_ERROR } from "@/lib/usage-cap";

export type TTryConsumeMonthlyLlmResult =
    | { ok: true; limits: TFeatureLimits | null }
    | { ok: false; reason: "usage_cap"; resets_on: string | null }
    | { ok: false; reason: "rpc_error"; error: Error };

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

/**
 * Non-stream paywall body for authenticated usage caps.
 * Status 402 - Payment Required. Client maps `error === "usage_cap"`.
 */
export function usageCapResponse(options?: {
    feature?: TUsageCapFeature;
    resets_on?: string | null;
}): Response {
    const feature: TUsageCapFeature = options?.feature ?? "monthly_llm_requests";
    const body: {
        error: typeof USAGE_CAP_ERROR;
        feature: TUsageCapFeature;
        resets_on?: string;
    } = {
        error: USAGE_CAP_ERROR,
        feature,
    };
    if (options?.resets_on) {
        body.resets_on = options.resets_on;
    }
    return new Response(JSON.stringify(body), {
        status: 402,
        headers: { "Content-Type": "application/json" },
    });
}

/**
 * QA cookie pre-check + atomic `try_consume_feature_usage` for LLM.
 * Call only when `user` is present. Does not start a model stream.
 *
 * Test-tier Free with remaining 0 returns paywall without consuming (so QA can
 * simulate empty quota above a real paid Stripe tier). Real caps always go
 * through the RPC - cookie cannot raise a Free user's SQL ceiling.
 */
export async function tryConsumeMonthlyLlmRequest(
    supabase: SupabaseClient,
    user: User,
): Promise<TTryConsumeMonthlyLlmResult> {
    const limits = await getServerMyFeatureLimits(supabase, user);

    if (limits?.remaining_llm_requests === 0) {
        return {
            ok: false,
            reason: "usage_cap",
            resets_on: limits.resets_on ?? null,
        };
    }

    const { data, error } = await supabase.rpc("try_consume_feature_usage", {
        p_feature: "monthly_llm_requests",
    });

    if (error) {
        return {
            ok: false,
            reason: "rpc_error",
            error: new Error(error.message),
        };
    }

    const allowed = Boolean(data?.[0]?.allowed);
    if (!allowed) {
        return {
            ok: false,
            reason: "usage_cap",
            resets_on: limits?.resets_on ?? null,
        };
    }

    return { ok: true, limits };
}
