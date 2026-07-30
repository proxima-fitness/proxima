/**
 * @module lib/hevy-share/load-share
 *
 * The one entry point both share tools call: parse link → throttle → server fetch → adapt.
 * `fetchHevyShareFolder` (sub-plan 2) and `importHevyShareFolder` (sub-plan 3) differ in what they do
 * with the result, never in how they get it. The link's kind picks the adapter - a completed
 * workout is a log, a folder or routine is a prescription - and every other step is shared.
 *
 * Depends on: lib/hevy-share/share-url, share-rate-limit, share-client, share-adapter, share-errors
 * Used by: chat share tools
 */
import {
    adaptHevyShareToRoutines,
    adaptHevyWorkoutToRoutines,
    type THevyShareWorkoutMeta,
} from "./share-adapter";
import { fetchHevyShareTarget } from "./share-client";
import { HevyShareError } from "./share-errors";
import { checkHevyShareRateLimit, hevyShareRateLimitKey } from "./share-rate-limit";
import {
    HEVY_SHARE_URL_SHAPES,
    formatHevyShareUrl,
    parseHevyShareUrl,
    type THevyShareTarget,
} from "./share-url";

/** Who is asking, for the per-user/IP throttle. Both fields may be absent - share reads are anon-OK. */
export type THevyShareCaller = {
    userId?: string | null;
    ip?: string | null;
};

/** An adapted share, ready for the agent to summarise or the client to hydrate. */
export type THevyShareLoadResult = {
    /** What the link pointed at, before identity was stripped from the routines. */
    target: THevyShareTarget;
    /** Canonical share URL, for echoing back to the user. */
    url: string;
    /** Shared folder title, workout name, or `null` when the payload carried neither. */
    title: string | null;
    /** Week-0 seed days with **builder routine keys**; no foreign Hevy routine/folder IDs. */
    routines: THevyRoutine[];
    /**
     * Session facts for a `workout` link - who logged it, when, how long, how much volume.
     * `null` for a folder or routine link, which prescribe rather than record.
     */
    workout: THevyShareWorkoutMeta | null;
};

/**
 * Loads a public Hevy share link as builder-ready week-0 routines.
 *
 * Read-only - never writes to Hevy, never creates a **Program-Hevy link**.
 *
 * A `workout` link resolves to a single day whose sets are **what the sharer actually lifted**;
 * folder and routine links resolve to prescriptions. `result.workout` is how a caller tells them
 * apart without re-reading the target kind.
 *
 * @param url - Pasted `hevy.com/folder/{id}`, `hevy.com/routine/{shortId}` or `hevy.com/workout/{id}` link
 * @param caller - Signed-in user id and/or client IP for the throttle
 * @throws {HevyShareError} `invalid_url`, `rate_limited`, `not_configured`, `not_found`, `upstream`, or `malformed`
 */
export async function loadHevyShare(
    url: string,
    caller: THevyShareCaller = {},
): Promise<THevyShareLoadResult> {
    const target = parseHevyShareUrl(url);

    if (!target) {
        throw new HevyShareError(
            "invalid_url",
            `That is not a Hevy share link. Expected ${HEVY_SHARE_URL_SHAPES}.`,
        );
    }

    const rateLimit = checkHevyShareRateLimit(hevyShareRateLimitKey(caller));
    if (!rateLimit.allowed) {
        throw new HevyShareError(
            "rate_limited",
            `Share link limit reached (${rateLimit.limit} per hour). Try again later.`,
        );
    }

    const payload = await fetchHevyShareTarget(target);
    const { title, routines, workout } =
        target.kind === "workout"
            ? adaptHevyWorkoutToRoutines(payload)
            : adaptHevyShareToRoutines(payload);

    return {
        target,
        url: formatHevyShareUrl(target),
        title,
        routines,
        workout: workout ?? null,
    };
}
