// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module lib/hevy-share/share-errors
 *
 * Single error type for the **Hevy share fetch** / **Hevy share import** pipeline.
 * Hevy's web share endpoints are undocumented and may change without notice, so
 * every failure carries a `reason` the agent tools can map onto `ToolErrorPanel`
 * copy ("Hevy's API may have changed") instead of leaking raw HTTP text.
 *
 * Depends on: nothing
 * Used by: lib/hevy-share/share-client, lib/hevy-share/share-adapter, chat share tools
 */

/**
 * Why a share load failed.
 *
 * - `invalid_url` - not a `hevy.com/folder/…` or `hevy.com/routine/…` link
 * - `not_configured` - server platform key env var missing
 * - `not_found` - Hevy returned 404/410 (share deleted or made private)
 * - `rate_limited` - our own light per-user/IP limit, or Hevy's 429
 * - `upstream` - any other non-2xx, network error, or timeout
 * - `malformed` - request succeeded but the payload held no readable routines
 */
export type THevyShareErrorReason =
    | "invalid_url"
    | "not_configured"
    | "not_found"
    | "rate_limited"
    | "upstream"
    | "malformed";

/** Failure from the Hevy share proxy - never surfaces the platform key or raw upstream body. */
export class HevyShareError extends Error {
    readonly reason: THevyShareErrorReason;
    /** Upstream HTTP status when the failure came from a Hevy response. */
    readonly status?: number;

    constructor(reason: THevyShareErrorReason, message: string, status?: number) {
        super(message);
        this.name = "HevyShareError";
        this.reason = reason;
        this.status = status;
    }
}

/** Type guard for callers that catch broadly. */
export function isHevyShareError(error: unknown): error is HevyShareError {
    return error instanceof HevyShareError;
}
