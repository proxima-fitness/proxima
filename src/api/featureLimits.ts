import { supabase } from ".";
import { User } from "@supabase/supabase-js";

const ANONYMOUS_LLM_STORAGE_KEY = "proxima_anonymous_llm_remaining";
const ANONYMOUS_LLM_MAX = 10;

// Test user tier override (client-side only, for allowlisted emails)
const TEST_USER_EMAILS = (
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_TEST_USER_EMAILS
        ? process.env.NEXT_PUBLIC_TEST_USER_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
        : []
) as string[];

export const TEST_TIER_OVERRIDE_KEY = "proxima_test_tier_override";

export type TestTierOverride = "free" | "pro";

/** Align with public.product_usage_limits: Free 1 export, 20 LLM; Pro 5 exports, 1000 LLM */
const TIER_LIMITS: Record<TestTierOverride, { tier: string; has_active_subscription: boolean; max_monthly_exports: number; max_monthly_llm_requests: number }> = {
    free: { tier: "Free", has_active_subscription: false, max_monthly_exports: 1, max_monthly_llm_requests: 20 },
    pro: { tier: "Pro", has_active_subscription: true, max_monthly_exports: 5, max_monthly_llm_requests: 1000 },
};

export function isTestUser(user: User | null | undefined): boolean {
    if (!user?.email) return false;
    return TEST_USER_EMAILS.includes(user.email.toLowerCase());
}

export function getTestTierOverride(): TestTierOverride | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(TEST_TIER_OVERRIDE_KEY);
    if (raw === "free" || raw === "pro") return raw;
    return null;
}

/** Sets test tier override (localStorage). Caller should invalidate ["feature-limits", user?.id] after. */
export function setTestTierOverride(value: TestTierOverride | null): void {
    if (typeof window === "undefined") return;
    if (value === null) {
        localStorage.removeItem(TEST_TIER_OVERRIDE_KEY);
    } else {
        localStorage.setItem(TEST_TIER_OVERRIDE_KEY, value);
    }
}

function getAnonymousLimits(): TFeatureLimits {
    if (typeof window === "undefined") {
        return {
            user_id: "",
            tier: "anonymous",
            has_active_subscription: null,
            max_monthly_exports: 0,
            monthly_exports_used: 0,
            remaining_exports: 0,
            max_monthly_llm_requests: ANONYMOUS_LLM_MAX,
            monthly_llm_requests_used: 0,
            remaining_llm_requests: ANONYMOUS_LLM_MAX,
        };
    }
    const stored = parseInt(localStorage.getItem(ANONYMOUS_LLM_STORAGE_KEY) ?? String(ANONYMOUS_LLM_MAX), 10);
    const remaining = Math.min(ANONYMOUS_LLM_MAX, Math.max(0, Number.isNaN(stored) ? ANONYMOUS_LLM_MAX : stored));
    return {
        user_id: "",
        tier: "anonymous",
        has_active_subscription: null,
        max_monthly_exports: 0,
        monthly_exports_used: 0,
        remaining_exports: 0,
        max_monthly_llm_requests: ANONYMOUS_LLM_MAX,
        monthly_llm_requests_used: ANONYMOUS_LLM_MAX - remaining,
        remaining_llm_requests: remaining,
    };
}

/** Fetches the current user's feature limits (or anonymous localStorage limits when not logged in). */
export const getMyFeatureLimits = async (user: User | undefined | null): Promise<TFeatureLimits | null> => {
    try {
        if (!user) {
            return getAnonymousLimits();
        }
        const { data, error } = await supabase.rpc("get_my_feature_limits");
        if (error) {
            console.error("Error fetching feature limits", error);
            return null;
        }
        const row = data[0] as unknown as TFeatureLimits;
        if (!row) return null;

        if (!isTestUser(user)) return row;

        if (typeof window === "undefined") return row;
        const override = getTestTierOverride();
        if (!override) return row;

        const limits = TIER_LIMITS[override];
        const monthly_exports_used = row.monthly_exports_used ?? 0;
        const monthly_llm_requests_used = row.monthly_llm_requests_used ?? 0;
        const remaining_exports = Math.max(0, limits.max_monthly_exports - monthly_exports_used);
        const remaining_llm_requests = Math.max(0, limits.max_monthly_llm_requests - monthly_llm_requests_used);

        return {
            ...row,
            tier: limits.tier,
            has_active_subscription: limits.has_active_subscription,
            max_monthly_exports: limits.max_monthly_exports,
            max_monthly_llm_requests: limits.max_monthly_llm_requests,
            monthly_exports_used: row.monthly_exports_used ?? 0,
            monthly_llm_requests_used: row.monthly_llm_requests_used ?? 0,
            remaining_exports,
            remaining_llm_requests,
        };
    } catch (err) {
        console.error("Error fetching feature limits", err);
        return null;
    }
};

/** Records an LLM request: RPC for logged-in user, or decrement localStorage for anonymous. */
export const recordLlmRequest = async (user: User | undefined | null): Promise<{ error: Error | null }> => {
    if (user) {
        return incrementMonthlyLlmRequests(user);
    }
    if (typeof window !== "undefined") {
        const current = parseInt(localStorage.getItem(ANONYMOUS_LLM_STORAGE_KEY) ?? String(ANONYMOUS_LLM_MAX), 10);
        const next = Math.max(0, Number.isNaN(current) ? ANONYMOUS_LLM_MAX - 1 : current - 1);
        localStorage.setItem(ANONYMOUS_LLM_STORAGE_KEY, String(next));
    }
    return { error: null };
};


/** Increments the current user's monthly_exports_used in feature_usage. Call after a successful export. */
export const incrementMonthlyExportsUsed = async (
    user: User | undefined | null
): Promise<{ error: Error | null }> => {
    if (!user) {
        return { error: null };
    }
    try {
        const { error } = await supabase.rpc("increment_feature_usage", {
            p_feature: "monthly_exports_used",
        });
        if (error) {
            console.error("Error incrementing monthly exports used", error);
            return { error: new Error(error.message) };
        }
        return { error: null };
    } catch (err) {
        console.error("Error incrementing monthly exports used", err);
        return { error: err instanceof Error ? err : new Error(String(err)) };
    }
};

/** Increments the current user's monthly_llm_requests in feature_usage. Call after a successful LLM build. */
export const incrementMonthlyLlmRequests = async (
    user: User | undefined | null
): Promise<{ error: Error | null }> => {
    if (!user) {
        return { error: null };
    }
    try {
        const { error } = await supabase.rpc("increment_feature_usage", {
            p_feature: "monthly_llm_requests",
        });
        if (error) {
            console.error("Error incrementing monthly LLM requests", error);
            return { error: new Error(error.message) };
        }
        return { error: null };
    } catch (err) {
        console.error("Error incrementing monthly LLM requests", err);
        return { error: err instanceof Error ? err : new Error(String(err)) };
    }
};

