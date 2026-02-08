import { supabase } from ".";
import { User } from "@supabase/supabase-js";

const ANONYMOUS_LLM_STORAGE_KEY = "proxima_anonymous_llm_remaining";
const ANONYMOUS_LLM_MAX = 10;

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
        return data[0] as unknown as TFeatureLimits;
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

