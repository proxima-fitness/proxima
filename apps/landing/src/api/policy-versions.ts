// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/policy-versions
 *
 * Server-side `policy_versions` reads via Supabase query builder.
 *
 * Depends on: @/lib/policy-versions (pure selection), @supabase/supabase-js
 * Used by: /api/policy-versions/current, /api/user-consents
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { selectCurrentPolicyVersions } from "@/lib/policy-versions";

/** Fetches current Terms and Privacy version metadata from `policy_versions`. */
export async function getCurrentPolicyVersions(
    supabase: SupabaseClient,
): Promise<TCurrentPolicyVersions> {
    const { data, error } = await supabase
        .from("policy_versions")
        .select("id, document_type, version_label, effective_at");

    if (error) {
        throw error;
    }

    const current = selectCurrentPolicyVersions((data ?? []) as TPolicyVersionRow[]);
    if (!current) {
        throw new Error("Current policy versions are not configured");
    }

    return current;
}
