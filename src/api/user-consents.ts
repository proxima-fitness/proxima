/**
 * @module api/user-consents
 *
 * Server-side `user_consents` reads/writes and browser fetch wrappers for
 * consent API routes.
 *
 * React Query keys:
 * - `CURRENT_POLICY_VERSIONS_QUERY_KEY` - `GET /api/policy-versions/current`
 * - `USER_CONSENTS_QUERY_KEY` - `GET /api/user-consents`
 *
 * Depends on: @/lib/user-consents, @supabase/supabase-js
 * Used by: /api/user-consents route, consent dialog (01d), Settings (01f)
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildOptionalConsentPatch } from "@/lib/user-consents";

/** Loads the signed-in user's consent row, or null when missing. */
export async function getUserConsents(
    supabase: SupabaseClient,
    userId: string,
): Promise<TUserConsentsRow | null> {
    const { data, error } = await supabase
        .from("user_consents")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return (data as TUserConsentsRow | null) ?? null;
}

/** Creates or updates legal acceptance FKs and `legal_accepted_at`. */
export async function upsertLegalAcceptance(
    supabase: SupabaseClient,
    userId: string,
    input: TLegalAcceptanceInput,
    optionalUpdates?: TOptionalConsentUpdates,
    now: Date = new Date(),
): Promise<TUserConsentsRow> {
    const acceptedAt = now.toISOString();
    const optionalPatch = optionalUpdates ? buildOptionalConsentPatch(optionalUpdates, now) : {};

    const { data, error } = await supabase
        .from("user_consents")
        .upsert(
            {
                user_id: userId,
                terms_version_id: input.termsVersionId,
                privacy_version_id: input.privacyVersionId,
                legal_accepted_at: acceptedAt,
                updated_at: acceptedAt,
                ...optionalPatch,
            },
            { onConflict: "user_id" },
        )
        .select("*")
        .single();

    if (error) {
        throw error;
    }

    return data as TUserConsentsRow;
}

/** Updates optional consent toggles on an existing row. */
export async function updateOptionalConsents(
    supabase: SupabaseClient,
    userId: string,
    updates: TOptionalConsentUpdates,
    now: Date = new Date(),
): Promise<TUserConsentsRow> {
    const patch = buildOptionalConsentPatch(updates, now);

    const { data, error } = await supabase
        .from("user_consents")
        .update(patch)
        .eq("user_id", userId)
        .select("*")
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new Error("User consents row not found");
    }

    return data as TUserConsentsRow;
}

export const CURRENT_POLICY_VERSIONS_QUERY_KEY = ["policy-versions", "current"] as const;
export const USER_CONSENTS_QUERY_KEY = ["user-consents"] as const;

/** Fetches current Terms and Privacy version metadata. */
export async function fetchCurrentPolicyVersions(): Promise<TCurrentPolicyVersions> {
    const response = await fetch("/api/policy-versions/current");
    if (!response.ok) {
        throw new Error("Failed to fetch current policy versions");
    }
    return response.json() as Promise<TCurrentPolicyVersions>;
}

/** Fetches the signed-in user's consent row, or null. */
export async function fetchUserConsents(): Promise<TUserConsentsRow | null> {
    const response = await fetch("/api/user-consents");
    if (response.status === 401) {
        throw new Error("Unauthorized");
    }
    if (!response.ok) {
        throw new Error("Failed to fetch user consents");
    }
    return response.json() as Promise<TUserConsentsRow | null>;
}

/** Upserts legal acceptance and/or optional consent toggles. */
export async function putUserConsents(input: TPutUserConsentsInput): Promise<TUserConsentsRow> {
    const response = await fetch("/api/user-consents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = payload?.error ?? "Failed to update user consents";
        const error = new Error(message) as Error & { status?: number };
        error.status = response.status;
        throw error;
    }

    return response.json() as Promise<TUserConsentsRow>;
}
