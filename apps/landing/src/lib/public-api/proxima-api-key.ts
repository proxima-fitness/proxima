// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module lib/public-api/proxima-api-key
 *
 * **Proxima API key** vault name, Bearer parse, and user-id resolve
 * (ADR 0026 / 02). Same vault RPCs as Hevy (`insert_secret` / `read_secret` /
 * `delete_secret`); distinct row name `proxima_api_key_{userId}`.
 *
 * Depends on: @supabase/supabase-js, @/hooks/supabase
 * Used by: account mint/revoke route, Public API auth (later slices)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";

/** Vault secret name prefix. Hevy uses `hevy_api_key_`. */
export const PROXIMA_API_KEY_SECRET_PREFIX = "proxima_api_key_" as const;

/** Minted token prefix so a Hevy UUID cannot be mistaken for this key. */
export const PROXIMA_API_KEY_TOKEN_PREFIX = "pxa_" as const;

const BEARER_PATTERN = /^Bearer\s+(\S+)\s*$/i;

export type TProximaApiKeyDb = SupabaseClient<Database>;

/**
 * Vault secret name for this athlete's **Proxima API key**.
 *
 * @param userId - `public.users.id`
 */
export function proximaApiKeySecretName(userId: string): string {
    return `${PROXIMA_API_KEY_SECRET_PREFIX}${userId}`;
}

/**
 * Reads the token from `Authorization: Bearer <token>`. Other schemes fail.
 *
 * @param authorization - Raw Authorization header, if any
 */
export function parseBearerToken(
    authorization: string | null | undefined,
): string | null {
    if (!authorization) {
        return null;
    }
    const match = BEARER_PATTERN.exec(authorization);
    return match?.[1] ?? null;
}

/**
 * Mints a **Proxima API key** token. Shown once; stored in Vault.
 */
export function generateProximaApiKey(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${PROXIMA_API_KEY_TOKEN_PREFIX}${hex}`;
}

/**
 * Resolves `Authorization: Bearer` to the athlete who minted that key.
 * Missing, malformed, unknown, or Hevy-vault secrets all return null (401).
 *
 * @param admin - Service-role client used for `resolve_proxima_api_key`
 * @param authorization - Raw Authorization header
 */
export async function resolveProximaApiKeyUserId(
    admin: TProximaApiKeyDb,
    authorization: string | null | undefined,
): Promise<string | null> {
    const token = parseBearerToken(authorization);
    if (!token) {
        return null;
    }

    const { data, error } = await admin.rpc("resolve_proxima_api_key", {
        p_secret: token,
    });
    if (error || data == null || data === "") {
        return null;
    }
    return data;
}

/**
 * Presence-only check. Uses Hevy's `read_secret`; never returns the token.
 *
 * @param userClient - Cookie-bound client (`auth.uid()` must be set)
 * @param userId - `public.users.id` (must match the session)
 */
export async function hasProximaApiKey(
    userClient: TProximaApiKeyDb,
    userId: string,
): Promise<boolean> {
    const { data, error } = await userClient.rpc("read_secret", {
        secret_name: proximaApiKeySecretName(userId),
    });
    if (error || data == null) {
        return false;
    }
    return typeof data === "string" ? data.trim().length > 0 : false;
}

/**
 * Deletes the signed-in athlete's **Proxima API key** vault row.
 *
 * @param userClient - Cookie-bound client
 * @param userId - `public.users.id` (must match the session)
 */
export async function revokeProximaApiKey(
    userClient: TProximaApiKeyDb,
    userId: string,
): Promise<boolean> {
    const { error } = await userClient.rpc("delete_secret", {
        secret_name: proximaApiKeySecretName(userId),
    });
    return !error;
}

/**
 * Revoke-and-replace: writes a new vault row and returns the token once.
 *
 * @param userClient - Cookie-bound client
 * @param userId - `public.users.id` (must match the session)
 */
export async function mintProximaApiKey(
    userClient: TProximaApiKeyDb,
    userId: string,
): Promise<string | null> {
    const revoked = await revokeProximaApiKey(userClient, userId);
    if (!revoked) {
        return null;
    }

    const key = generateProximaApiKey();
    const { error } = await userClient.rpc("insert_secret", {
        secret: key,
        secret_name: proximaApiKeySecretName(userId),
    });
    if (error) {
        return null;
    }
    return key;
}
