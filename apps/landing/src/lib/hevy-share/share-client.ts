/**
 * @module lib/hevy-share/share-client
 *
 * Server-only access to Hevy's undocumented **web share** endpoints - the ones the
 * hevy.com share pages call for a shared folder, a shared routine, or a public completed
 * workout, not the account-scoped `/v1` partner API. Authenticates
 * with a platform `x-api-key` held in server env plus `Hevy-Platform: web`; the key
 * must never reach the browser, so every caller has to run in a route handler or
 * agent tool.
 *
 * Returns raw JSON only - shaping into `THevyRoutine[]` is the adapter's job.
 *
 * Depends on: lib/hevy-share/share-errors, lib/hevy-share/share-url
 * Used by: lib/hevy-share/load-share
 */
import { HevyShareError } from "./share-errors";
import type { THevyShareTarget } from "./share-url";

/** Base for Hevy's private web endpoints (same host as `/v1`, different paths). */
export const HEVY_SHARE_API_BASE = "https://api.hevyapp.com";

/** Env var holding the platform `x-api-key`. Server-only - no `NEXT_PUBLIC_` prefix by design. */
export const HEVY_SHARE_PLATFORM_KEY_ENV = "HEVY_SHARE_PLATFORM_KEY";

/** Hevy rejects platform-key requests that do not declare a platform. */
const HEVY_SHARE_PLATFORM = "web";

/** Give up rather than hold an agent tool call open on a slow share endpoint. */
const HEVY_SHARE_TIMEOUT_MS = 10_000;

/**
 * Reads the server platform key.
 *
 * @throws {HevyShareError} `not_configured` when the env var is unset
 */
function readPlatformKey(): string {
    const key = process.env[HEVY_SHARE_PLATFORM_KEY_ENV]?.trim();

    if (!key) {
        throw new HevyShareError(
            "not_configured",
            `${HEVY_SHARE_PLATFORM_KEY_ENV} is not set - Hevy share links cannot be read on this deployment.`,
        );
    }

    return key;
}

/**
 * GETs a Hevy web share path and parses the JSON body.
 *
 * Maps upstream status onto {@link HevyShareError} reasons so tools can pick copy
 * without inspecting HTTP codes.
 *
 * @param path - Path beginning with `/`, already URL-encoded
 * @throws {HevyShareError} On missing key, 404/410, 429, any other non-2xx, timeout, or unparsable body
 */
async function shareGet<T>(path: string): Promise<T> {
    const platformKey = readPlatformKey();

    let response: Response;
    try {
        response = await fetch(`${HEVY_SHARE_API_BASE}${path}`, {
            method: "GET",
            headers: {
                accept: "application/json",
                "x-api-key": platformKey,
                "Hevy-Platform": HEVY_SHARE_PLATFORM,
            },
            cache: "no-store",
            signal: AbortSignal.timeout(HEVY_SHARE_TIMEOUT_MS),
        });
    } catch (error) {
        const detail = error instanceof Error ? error.message : "unknown error";
        throw new HevyShareError("upstream", `Could not reach Hevy to read that share link (${detail}).`);
    }

    if (response.status === 404 || response.status === 410) {
        throw new HevyShareError(
            "not_found",
            "Hevy has no share at that link - it may have been deleted or made private.",
            response.status,
        );
    }

    if (response.status === 429) {
        throw new HevyShareError("rate_limited", "Hevy is rate limiting share reads right now.", 429);
    }

    if (!response.ok) {
        throw new HevyShareError(
            "upstream",
            `Hevy share request failed with status ${response.status}.`,
            response.status,
        );
    }

    try {
        return (await response.json()) as T;
    } catch {
        throw new HevyShareError(
            "malformed",
            "Hevy returned a share response we could not parse as JSON.",
            response.status,
        );
    }
}

/** `GET /shareable_folder/{id}` - a shared routine folder and its routines. */
export async function fetchShareableFolder(folderId: string): Promise<unknown> {
    return shareGet(`/shareable_folder/${encodeURIComponent(folderId)}`);
}

/** `GET /routine_with_short_id/{shortId}` - a single shared routine. */
export async function fetchRoutineWithShortId(shortId: string): Promise<unknown> {
    return shareGet(`/routine_with_short_id/${encodeURIComponent(shortId)}`);
}

/**
 * `GET /workout/{id}` - a single public **completed workout**.
 *
 * Takes either the workout UUID or its `short_id`, which is what lets one path serve every
 * `hevy.com/workout/…` link shape. Answers 404 for a workout that is not public, but the
 * adapter still checks the payload's own privacy fields rather than trusting that.
 */
export async function fetchSharedWorkout(workoutId: string): Promise<unknown> {
    return shareGet(`/workout/${encodeURIComponent(workoutId)}`);
}

/** Dispatches to the endpoint that matches a parsed share link. */
export async function fetchHevyShareTarget(target: THevyShareTarget): Promise<unknown> {
    switch (target.kind) {
        case "folder":
            return fetchShareableFolder(target.folderId);
        case "routine":
            return fetchRoutineWithShortId(target.shortId);
        case "workout":
            return fetchSharedWorkout(target.workoutId);
    }
}

/** True when this deployment has a platform key, so callers can degrade before fetching. */
export function isHevyShareConfigured(): boolean {
    return Boolean(process.env[HEVY_SHARE_PLATFORM_KEY_ENV]?.trim());
}
