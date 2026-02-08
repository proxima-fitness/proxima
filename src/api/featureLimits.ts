import { supabase } from ".";
import { User } from "@supabase/supabase-js";


/** Fetches the current user's feature limits */
export const getMyFeatureLimits = async (user: User | undefined | null): Promise<TFeatureLimits | null> => {
    try {
        if (!user) {
            return null;
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

