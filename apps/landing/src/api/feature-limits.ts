/**
 * @module api/featureLimits
 *
 * Feature-gating and usage-tracking layer for LLM requests. Supports three user states:
 *
 * 1. **Anonymous** - tracked entirely in localStorage (no account needed).
 * 2. **Free / Pro / Pro+** - limits from `get_my_feature_limits` (backed by
 *    `product_usage_limits`). Authenticated LLM consume is server-side
 *    (`try_consume_feature_usage` in `/api/chat`). Hevy writes are not metered (ADR 0015).
 * 3. **Test users** - allowlisted emails that can override tier (Free, Pro, Pro+)
 *    via localStorage (mirrored to a cookie for server-side paywall checks).
 *
 * Depends on: ./index (supabase client), @supabase/supabase-js (User type)
 * Used by: hooks.ts (useMyFeatureLimits), anonymous chat meter
 */
import { supabase } from ".";
import { User } from "@supabase/supabase-js";

const ANONYMOUS_LLM_STORAGE_KEY = "proxima_anonymous_llm_remaining";
const ANONYMOUS_LLM_MAX = 10;

// Test user tier override (localStorage + cookie mirror for server routes)
const TEST_USER_EMAILS = (
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_TEST_USER_EMAILS
        ? process.env.NEXT_PUBLIC_TEST_USER_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
        : []
) as string[];

export const TEST_TIER_OVERRIDE_KEY = "proxima_test_tier_override";

export type TTestTierOverride = "free" | "pro" | "pro_plus";

/** Test overrides only - mirrors `public.product_usage_limits` (product_title): Free 2/45; Pro 3/100; Pro+ 10/1000 */
export const TEST_TIER_LIMITS: Record<TTestTierOverride, { tier: string; has_active_subscription: boolean; max_monthly_exports: number; max_monthly_llm_requests: number }> = {
    free: { tier: "Free", has_active_subscription: false, max_monthly_exports: 2, max_monthly_llm_requests: 45 },
    pro: { tier: "Pro", has_active_subscription: true, max_monthly_exports: 3, max_monthly_llm_requests: 100 },
    pro_plus: { tier: "Pro+", has_active_subscription: true, max_monthly_exports: 10, max_monthly_llm_requests: 1000 },
};

/**
 * Checks whether the given user's email is in the test-user allowlist.
 *
 * @param user - The Supabase auth user, or null/undefined
 * @returns `true` if the user's email matches an entry in NEXT_PUBLIC_TEST_USER_EMAILS
 */
export function isTestUser(user: User | null | undefined): boolean {
    if (!user?.email) return false;
    return TEST_USER_EMAILS.includes(user.email.toLowerCase());
}

/**
 * Reads the current test-tier override from localStorage.
 *
 * @returns A `TestTierOverride` if set and valid, otherwise `null`
 */
export function parseTestTierOverride(raw: string | null | undefined): TTestTierOverride | null {
    if (raw != null && raw in TEST_TIER_LIMITS) {
        return raw as TTestTierOverride;
    }
    return null;
}

export function applyTestTierOverrideToLimits(
    row: TFeatureLimits,
    override: TTestTierOverride,
): TFeatureLimits {
    const limits = TEST_TIER_LIMITS[override];
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
}

/** Mirrors localStorage test-tier override to a cookie so server routes can apply the same gating. */
export function syncTestTierOverrideToCookie(): void {
    if (typeof document === "undefined") return;
    const override = getTestTierOverride();
    if (override) {
        document.cookie = `${TEST_TIER_OVERRIDE_KEY}=${override}; path=/; SameSite=Lax`;
    } else {
        document.cookie = `${TEST_TIER_OVERRIDE_KEY}=; path=/; Max-Age=0; SameSite=Lax`;
    }
}

export function getTestTierOverride(): TTestTierOverride | null {
    if (typeof window === "undefined") return null;
    return parseTestTierOverride(localStorage.getItem(TEST_TIER_OVERRIDE_KEY));
}

/** Sets test tier override (localStorage). Caller should invalidate ["feature-limits", user?.id] after. */
export function setTestTierOverride(value: TTestTierOverride | null): void {
    if (typeof window === "undefined") return;
    if (value === null) {
        localStorage.removeItem(TEST_TIER_OVERRIDE_KEY);
    } else {
        localStorage.setItem(TEST_TIER_OVERRIDE_KEY, value);
    }
    syncTestTierOverrideToCookie();
}

/**
 * Builds a TFeatureLimits object for unauthenticated users based on the
 * remaining LLM request count stored in localStorage.
 */
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
            period_start: null,
            resets_on: null,
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
        period_start: null,
        resets_on: null,
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
        const row: TFeatureLimits | undefined = data[0];
        if (!row) return null;

        if (!isTestUser(user)) return row;

        if (typeof window === "undefined") return row;
        syncTestTierOverrideToCookie();
        const override = getTestTierOverride();
        if (!override) return row;

        return applyTestTierOverrideToLimits(row, override);
    } catch (err) {
        console.error("Error fetching feature limits", err);
        return null;
    }
};

/**
 * Decrement the anonymous localStorage LLM counter.
 * Authenticated LLM metering is owned by POST /api/chat (`try_consume_feature_usage`).
 */
export function recordAnonymousLlmRequest(): void {
    if (typeof window === "undefined") return;
    const current = parseInt(
        localStorage.getItem(ANONYMOUS_LLM_STORAGE_KEY) ?? String(ANONYMOUS_LLM_MAX),
        10,
    );
    const next = Math.max(0, Number.isNaN(current) ? ANONYMOUS_LLM_MAX - 1 : current - 1);
    localStorage.setItem(ANONYMOUS_LLM_STORAGE_KEY, String(next));
}

