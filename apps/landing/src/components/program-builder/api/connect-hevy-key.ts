/**
 * @module connect-hevy-key
 * Shared validate → vault write → query invalidate for every Hevy API key connect UI.
 * Never logs or returns the key itself; callers own their own toasts / sync triggers.
 * Depends on: hevy (postHevyApikey, updateHevyApiKey), uuid, react-query QueryClient.
 * Used by: HevyExportGate, ConnectHevyDialog.
 */
import type { QueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { validate as validateUuid } from "uuid";
import { postHevyApikey, updateHevyApiKey } from "./hevy";

/** Shown when the pasted value is not a Hevy key (uuid) - matches existing connect UIs. */
export const INVALID_HEVY_API_KEY_MESSAGE = "Invalid Hevy API Key";

/** Success copy shared by the standalone connect UIs (the export gate toasts via its parent instead). */
export const HEVY_API_KEY_SAVED_MESSAGE = "Hevy API Key saved successfully";

/** Result of a connect attempt. `message` is safe to surface - it never contains the key. */
export type TConnectHevyKeyResult =
    | { status: "saved" }
    | { status: "invalid_key"; message: string }
    | { status: "failed"; message: string };

interface IConnectHevyKeyArgs {
    /** Authenticated user; anonymous callers get a `failed` result rather than a vault write. */
    user: User | null | undefined;
    /** Raw input value; trimmed before validation. */
    apiKey: string;
    /** Current vault key, when known - non-empty rotates (delete + insert) instead of inserting. */
    existingApiKey?: string | null;
    queryClient: QueryClient;
}

/**
 * Validates the pasted key, writes it to the Supabase vault, and invalidates the
 * queries that depend on Hevy connection state.
 */
export async function connectHevyKey({
    user,
    apiKey,
    existingApiKey,
    queryClient,
}: IConnectHevyKeyArgs): Promise<TConnectHevyKeyResult> {
    const candidate = apiKey.trim();

    if (!validateUuid(candidate)) {
        return { status: "invalid_key", message: INVALID_HEVY_API_KEY_MESSAGE };
    }
    if (!user) {
        return { status: "failed", message: "You must be signed in to connect Hevy." };
    }

    if (existingApiKey && existingApiKey.length > 0) {
        const updated = await updateHevyApiKey(user, candidate);
        if (!updated) {
            return { status: "failed", message: "Error saving Hevy API Key: Unknown error" };
        }
    } else {
        const result = await postHevyApikey(user, candidate);
        if (!result?.success) {
            const detail = result?.data ? JSON.stringify(result.data) : "Unknown error";
            return { status: "failed", message: `Error saving Hevy API Key: ${detail}` };
        }
    }

    queryClient.invalidateQueries({ queryKey: ["hevy_api_key"] });
    queryClient.invalidateQueries({ queryKey: ["exercise-stalls-analysis", user.id] });

    return { status: "saved" };
}
