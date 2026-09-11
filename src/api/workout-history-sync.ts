/**

 * @module api/workout-history-sync

 *

 * Chunked Hevy workout backup orchestration: one request fetches one Hevy page

 * and imports each workout via {@link importHevyWorkout}. Cursor state lives on

 * `hevy_workouts_count` (`last_known_workout_count`, `last_synced_page`, `sync_error`).

 *

 * Depends on: api/workout-history, program-builder/api/hevy (fetch + rate limits)

 * Used by: POST /api/workout-history/sync, connect-Hevy trigger, 01d ensureFresh

 */

import {

    defaultFetch,

    delay,

    HevyRateLimitError,

    isHevyRateLimitError,

    RATE_LIMIT_MAX_RETRIES,

} from "@/components/program-builder/api/hevy";

import {

    HEVY_WORKOUT_SOURCE,

    deleteBackedUpWorkoutByExternalId,

    importHevyWorkout,

} from "./workout-history";



/** Workouts per Hevy API page for backup chunks. */

export const WORKOUT_SYNC_PAGE_SIZE = 10;



const WORKOUT_SYNC_LOG_PREFIX = "[workout-history-sync]";






function logSyncEvent(userId: string, event: string, details: Record<string, unknown>): void {

    console.info(`${WORKOUT_SYNC_LOG_PREFIX} ${event}`, { userId, ...details });

}



/** Browser-friendly log for chunk results (DevTools console). */

export function logWorkoutHistorySyncChunkResult(result: TSyncChunkResult): void {

    if (result.rateLimited) {

        console.info(`${WORKOUT_SYNC_LOG_PREFIX} rate_limited`, {

            backedUpCount: result.backedUpCount,

            hevyCount: result.hevyCount,

        });

        return;

    }



    if (result.chunk) {

        console.info(`${WORKOUT_SYNC_LOG_PREFIX} chunk`, {

            page: `${result.chunk.page}/${result.chunk.pageCount}`,

            inserted: result.chunk.inserted,

            skipped: result.chunk.skipped,

            backedUpCount: result.backedUpCount,

            hevyCount: result.hevyCount,

            done: result.done,

            syncError: result.syncError,

        });

        return;

    }



    console.info(`${WORKOUT_SYNC_LOG_PREFIX} status`, {

        backedUpCount: result.backedUpCount,

        hevyCount: result.hevyCount,

        done: result.done,

        syncError: result.syncError,

    });

}



/**

 * GET with 5xx retry (short backoff). 429 fails fast so the client poller can

 * exponential-backoff without exceeding serverless route timeouts.

 */

async function fetchHevyGetWithRetry<T>(url: string, apiKey: string): Promise<T> {

    for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {

        try {

            return await defaultFetch<T>(url, apiKey);

        } catch (error: unknown) {

            if (isHevyRateLimitError(error)) {

                throw new HevyRateLimitError(

                    error instanceof Error ? error.message : "HTTP GET error! Status: 429",

                );

            }



            const message = error instanceof Error ? error.message : "";

            const is5xx = /Status: 5\d\d/.test(message);



            if (!is5xx || retry >= RATE_LIMIT_MAX_RETRIES) {

                throw error;

            }



            await delay(Math.min(8_000, 1_000 * Math.pow(2, retry)));

        }

    }



    throw new Error("Hevy fetch failed after retries");

}



async function handleHevyFetchFailure(

    db: TWorkoutHistoryDb,

    userId: string,

    error: unknown,

    backedUpCount: number,

    hevyCount: number,

): Promise<TSyncChunkResult> {

    if (error instanceof HevyRateLimitError || isHevyRateLimitError(error)) {

        logSyncEvent(userId, "rate_limited", { backedUpCount, hevyCount });

        return { backedUpCount, hevyCount, syncError: null, done: false, rateLimited: true };

    }



    const message = error instanceof Error ? error.message : "Hevy request failed";

    logSyncEvent(userId, "hevy_fetch_failed", { backedUpCount, hevyCount, message });

    await upsertHevyWorkoutsCountCursor(db, userId, { syncError: message });

    const { syncError } = await readSyncCursor(db, userId);

    return { backedUpCount, hevyCount, syncError, done: false };

}



/**

 * Fetches one Hevy workouts page (429 → fast fail; 5xx → short in-request retry).

 */

async function fetchHevyWorkoutsPage(apiKey: string, page: number, pageSize: number): Promise<THevyWorkoutsResponse> {

    const url = `https://api.hevyapp.com/v1/workouts?page=${page}&pageSize=${pageSize}`;

    return fetchHevyGetWithRetry<THevyWorkoutsResponse>(url, apiKey);

}



/**

 * Fetches live Hevy workout count (429 → fast fail; 5xx → short in-request retry).

 */

export async function fetchHevyWorkoutCount(apiKey: string): Promise<number> {

    const url = "https://api.hevyapp.com/v1/workouts/count";

    const response = await fetchHevyGetWithRetry<{ workout_count: number }>(url, apiKey);

    return response.workout_count ?? 0;

}



/**

 * Counts backed-up Hevy workouts for a user in `workouts`.

 */

export async function countBackedUpWorkouts(db: TWorkoutHistoryDb,userId: string): Promise<number> {

    const { count, error } = await db

        .from("workouts")

        .select("*", { count: "exact", head: true })

        .eq("user_id", userId)

        .eq("source", HEVY_WORKOUT_SOURCE);



    if (error) {

        throw new Error(error.message);

    }



    return count ?? 0;

}



/**

 * Reads sync cursor row from `hevy_workouts_count`.

 */

export async function readSyncCursor(db: TWorkoutHistoryDb,userId: string): Promise<{ lastKnownWorkoutCount: number | null; lastSyncedPage: number | null; syncError: string | null; lastWorkoutEventsAt: string | null }> {

    const { data, error } = await db

        .from("hevy_workouts_count")

        .select("last_known_workout_count, last_synced_page, sync_error, last_workout_events_at")

        .eq("user_id", userId)

        .maybeSingle();



    if (error) {

        throw new Error(error.message);

    }



    return {

        lastKnownWorkoutCount: data?.last_known_workout_count ?? null,

        lastSyncedPage: data?.last_synced_page ?? null,

        syncError: data?.sync_error ?? null,

        lastWorkoutEventsAt: data?.last_workout_events_at ?? null,

    };

}



/**

 * Upserts `hevy_workouts_count` cursor fields for a user.

 */

export async function upsertHevyWorkoutsCountCursor(db: TWorkoutHistoryDb,userId: string,patch: { lastKnownWorkoutCount?: number; lastSyncedPage?: number | null; syncError?: string | null; lastWorkoutEventsAt?: string }): Promise<void> {

    const row: Record<string, unknown> = {

        user_id: userId,

        updated_at: new Date().toISOString(),

    };



    if (patch.lastKnownWorkoutCount !== undefined) {

        row.last_known_workout_count = patch.lastKnownWorkoutCount;

    }

    if (patch.lastSyncedPage !== undefined) {

        row.last_synced_page = patch.lastSyncedPage;

    }

    if (patch.syncError !== undefined) {

        row.sync_error = patch.syncError;

    }

    if (patch.lastWorkoutEventsAt !== undefined) {

        row.last_workout_events_at = patch.lastWorkoutEventsAt;

    }



    const { error } = await db

        .from("hevy_workouts_count")

        .upsert(row, { onConflict: "user_id" });



    if (error) {

        throw new Error(error.message);

    }

}



/**

 * Chooses the Hevy workouts page for the next sync chunk.

 * Backfill walks pages 1..N (newest-first). Delta sync re-reads page 1 when

 * live count grew after a completed cursor (`last_synced_page` is null). Once a

 * page walk is in progress, `last_synced_page` advances even if delta conditions match.

 */

export function computeSyncPage(backedUpCount: number,lastKnownWorkoutCount: number | null,hevyCount: number,lastSyncedPage: number | null = null,pageSize: number = WORKOUT_SYNC_PAGE_SIZE): number {

    // In-progress page walk wins over delta detection so crossing last_known_workout_count

    // mid-backfill does not reset to page 1.

    if (lastSyncedPage !== null) {

        return lastSyncedPage + 1;

    }



    const isDelta =

        lastKnownWorkoutCount !== null &&

        backedUpCount >= lastKnownWorkoutCount &&

        hevyCount > lastKnownWorkoutCount;



    if (isDelta) {

        return 1;

    }



    return Math.floor(backedUpCount / pageSize) + 1;

}



function buildChunkMeta(page: number, pageCount: number, inserted: number, skipped: number): TSyncChunkResult["chunk"] {

    return { page, pageCount, inserted, skipped };

}



/**

 * Imports one Hevy page (or fewer when caught up) for a user.

 * Safe to retry; does not advance `last_known_workout_count` until fully caught up.

 */

export async function runSyncChunk(db: TWorkoutHistoryDb,params: { userId: string; apiKey: string }): Promise<TSyncChunkResult> {

    const { userId, apiKey } = params;



    let hevyCount: number;

    try {

        hevyCount = await fetchHevyWorkoutCount(apiKey);

    } catch (error: unknown) {

        const backedUpCount = await countBackedUpWorkouts(db, userId);

        return handleHevyFetchFailure(db, userId, error, backedUpCount, backedUpCount);

    }



    let backedUpCount = await countBackedUpWorkouts(db, userId);

    const { lastKnownWorkoutCount, lastSyncedPage } = await readSyncCursor(db, userId);



    if (backedUpCount >= hevyCount) {

        await upsertHevyWorkoutsCountCursor(db, userId, {

            lastKnownWorkoutCount: hevyCount,

            lastSyncedPage: null,

            syncError: null,

        });

        logSyncEvent(userId, "already_synced", { backedUpCount, hevyCount });

        return { backedUpCount, hevyCount, syncError: null, done: true };

    }



    const page = computeSyncPage(backedUpCount, lastKnownWorkoutCount, hevyCount, lastSyncedPage);

    logSyncEvent(userId, "chunk_start", {

        page,

        lastSyncedPage,

        backedUpCount,

        hevyCount,

        lastKnownWorkoutCount,

    });



    let workoutsResponse: THevyWorkoutsResponse;

    try {

        workoutsResponse = await fetchHevyWorkoutsPage(apiKey, page, WORKOUT_SYNC_PAGE_SIZE);

    } catch (error: unknown) {

        return handleHevyFetchFailure(db, userId, error, backedUpCount, hevyCount);

    }



    const pageCount = workoutsResponse.page_count ?? Math.ceil(hevyCount / WORKOUT_SYNC_PAGE_SIZE);

    const workouts = workoutsResponse.workouts ?? [];

    if (workouts.length === 0) {

        const message = `Hevy returned no workouts for page ${page} while backup is incomplete`;

        logSyncEvent(userId, "empty_page", { page, pageCount, backedUpCount, hevyCount, message });

        await upsertHevyWorkoutsCountCursor(db, userId, { syncError: message });

        return { backedUpCount, hevyCount, syncError: message, done: false };

    }



    let inserted = 0;

    let skipped = 0;



    for (const workout of workouts) {

        let result: TImportHevyWorkoutResult;

        try {

            result = await importHevyWorkout(db, { userId, workout, apiKey });

        } catch (error: unknown) {

            // Resolving exercise ownership can hit Hevy; a 429 there must back off, not persist.

            return handleHevyFetchFailure(db, userId, error, backedUpCount, hevyCount);

        }

        if (result.status === "error") {

            logSyncEvent(userId, "import_failed", {

                page,

                workoutId: workout.id,

                message: result.message,

            });

            await upsertHevyWorkoutsCountCursor(db, userId, { syncError: result.message });

            return {

                backedUpCount,

                hevyCount,

                syncError: result.message,

                done: false,

                chunk: buildChunkMeta(page, pageCount, inserted, skipped),

            };

        }

        if (result.status === "inserted") {

            inserted += 1;

        } else {

            skipped += 1;

        }

    }



    backedUpCount = await countBackedUpWorkouts(db, userId);

    const chunk = buildChunkMeta(page, pageCount, inserted, skipped);



    logSyncEvent(userId, "chunk_complete", {

        ...chunk,

        backedUpCount,

        hevyCount,

        lastSyncedPageNext: page,

    });



    if (backedUpCount >= hevyCount) {

        await upsertHevyWorkoutsCountCursor(db, userId, {

            lastKnownWorkoutCount: hevyCount,

            lastSyncedPage: null,

            syncError: null,

        });

        return { backedUpCount, hevyCount, syncError: null, done: true, chunk };

    }



    if (page >= pageCount && backedUpCount < hevyCount) {

        const message = `Backup incomplete after scanning all ${pageCount} Hevy pages (${backedUpCount}/${hevyCount} stored)`;

        logSyncEvent(userId, "scan_exhausted", { page, pageCount, backedUpCount, hevyCount, message });

        await upsertHevyWorkoutsCountCursor(db, userId, {

            lastSyncedPage: page,

            syncError: message,

        });

        return { backedUpCount, hevyCount, syncError: message, done: false, chunk };

    }



    await upsertHevyWorkoutsCountCursor(db, userId, {

        lastSyncedPage: page,

        syncError: null,

    });

    return { backedUpCount, hevyCount, syncError: null, done: false, chunk };

}



/**

 * Fire-and-forget first sync chunk after Hevy connect (browser only).

 */

export function triggerWorkoutHistorySync(): void {

    void runWorkoutHistorySyncChunk();

}



/** Delay between client poller chunks when sync is progressing normally. */

export const WORKOUT_SYNC_POLL_DELAY_MS = 2_000;



/** Base delay before retrying after Hevy 429 (client exponential backoff). */

export const WORKOUT_SYNC_RATE_LIMIT_POLL_DELAY_MS = 60_000;



/** Cap for client 429 backoff (60s → 120s → 240s → 480s). */

export const WORKOUT_SYNC_RATE_LIMIT_MAX_DELAY_MS = 480_000;



/**

 * Client poll delay after a rate-limited chunk (exponential on consecutive 429s).

 */

export function workoutSyncRateLimitPollDelayMs(consecutiveRateLimits: number): number {

    const attempt = Math.max(1, consecutiveRateLimits);

    const delay = WORKOUT_SYNC_RATE_LIMIT_POLL_DELAY_MS * Math.pow(2, attempt - 1);

    return Math.min(delay, WORKOUT_SYNC_RATE_LIMIT_MAX_DELAY_MS);

}



/**

 * Fetches derived backup progress for the authenticated user (browser only).

 */

export async function fetchWorkoutHistorySyncProgress(): Promise<TWorkoutSyncProgress> {

    const response = await fetch("/api/workout-history/progress");

    if (!response.ok) {

        throw new Error("Failed to fetch workout history sync progress");

    }

    return response.json() as Promise<TWorkoutSyncProgress>;

}



let inflightChunk: Promise<TSyncChunkResult> | null = null;



/**

 * Runs one backup chunk for the authenticated user (browser only).

 * Concurrent callers share one in-flight POST so two pollers cannot import the same page.

 */

export async function runWorkoutHistorySyncChunk(): Promise<TSyncChunkResult> {

    if (inflightChunk) {

        return inflightChunk;

    }



    inflightChunk = (async (): Promise<TSyncChunkResult> => {

        const response = await fetch("/api/workout-history/sync", { method: "POST" });

        if (!response.ok) {

            throw new Error("Failed to run workout history sync chunk");

        }

        const result = (await response.json()) as TSyncChunkResult;

        logWorkoutHistorySyncChunkResult(result);

        return result;

    })().finally(() => {

        inflightChunk = null;

    });



    return inflightChunk;

}



/** True when backup is still catching up and no cursor error is set. */

export function isWorkoutHistorySyncInProgress(progress: TWorkoutSyncProgress): boolean {

    return progress.backedUpCount < progress.hevyCount && !progress.syncError;

}



/** True when the global sync banner should render. */

export function shouldShowWorkoutHistorySyncBanner(progress: TWorkoutSyncProgress | null): boolean {

    if (!progress) return false;

    return isWorkoutHistorySyncInProgress(progress) || Boolean(progress.syncError);

}



/** Profile / status UI indicator for workout backup state. */

export type TWorkoutHistorySyncStatus = "synced" | "syncing" | "error" | "paused";



/**

 * Derives sync status for profile indicator (green / yellow / red / grey dot).

 */

export function getWorkoutHistorySyncStatus(

    progress: TWorkoutSyncProgress | null,

): TWorkoutHistorySyncStatus | null {

    if (!progress) return null;

    if (progress.paused && isWorkoutHistorySyncInProgress(progress)) return "paused";

    if (progress.syncError) return "error";

    if (isWorkoutHistorySyncInProgress(progress)) return "syncing";

    return "synced";

}

/** Events per page from Hevy's delta feed (same ceiling as the workouts list). */
export const WORKOUT_EVENTS_PAGE_SIZE = 10;

/** Pages of events consumed in one pass before yielding to the next run. */
export const WORKOUT_EVENTS_MAX_PAGES = 10;

/** First-run lookback when no events cursor exists yet. */
export const WORKOUT_EVENTS_BOOTSTRAP_DAYS = 30;

export type TWorkoutEventsSyncResult = {
    /** Events read from Hevy. */
    scanned: number;
    /** Workouts inserted or replaced from an `updated` event. */
    imported: number;
    /** Backed-up workouts removed because Hevy no longer has them. */
    deleted: number;
    /** False when the page budget ran out — the cursor is left where it was. */
    complete: boolean;
};

/**
 * Fetches one page of Hevy's workout events feed (429 → fast fail; 5xx → retry).
 */
async function fetchHevyWorkoutEventsPage(
    apiKey: string,
    page: number,
    pageSize: number,
    since: string,
): Promise<THevyWorkoutEventsResponse> {
    const url =
        `https://api.hevyapp.com/v1/workouts/events` +
        `?page=${page}&pageSize=${pageSize}&since=${encodeURIComponent(since)}`;

    return fetchHevyGetWithRetry<THevyWorkoutEventsResponse>(url, apiKey);
}

/**
 * Applies Hevy's workout events to the backup mirror since the stored cursor.
 *
 * {@link runSyncChunk} is count-driven and therefore blind to anything that
 * leaves Hevy's total unchanged: an edited session, a re-finished one, or a
 * delete-and-relog. The events feed states those explicitly, so this is what
 * keeps the mirror's contents — and its count — equal to Hevy's.
 *
 * The cursor only advances after a complete pass; a rate-limited or truncated
 * run re-reads the same events next time, which is safe because importing and
 * deleting by Hevy id are both idempotent.
 *
 * @param db - Supabase client (user or service role)
 * @param params - Sync context
 * @param params.userId - Proxima user ID owning the backup rows
 * @param params.apiKey - Syncing user's Hevy API key
 * @param params.since - Override the stored cursor (ISO 8601)
 * @param params.maxPages - Page budget (default {@link WORKOUT_EVENTS_MAX_PAGES})
 * @throws {HevyRateLimitError} When Hevy rate-limits a page or a template lookup
 */
export async function syncHevyWorkoutEvents(
    db: TWorkoutHistoryDb,
    params: { userId: string; apiKey: string; since?: string; maxPages?: number },
): Promise<TWorkoutEventsSyncResult> {
    const { userId, apiKey } = params;
    const maxPages = Math.max(1, params.maxPages ?? WORKOUT_EVENTS_MAX_PAGES);
    const startedAt = new Date().toISOString();

    const { lastWorkoutEventsAt, lastSyncedPage } = await readSyncCursor(db, userId);
    if (lastSyncedPage !== null) {
        logSyncEvent(userId, "events_skipped_during_backfill", { lastSyncedPage });
        return { scanned: 0, imported: 0, deleted: 0, complete: false };
    }

    let since = params.since;
    if (!since) {
        since =
            lastWorkoutEventsAt ??
            new Date(
                Date.now() - WORKOUT_EVENTS_BOOTSTRAP_DAYS * 24 * 60 * 60 * 1000,
            ).toISOString();
    }

    let scanned = 0;
    let imported = 0;
    let deleted = 0;
    let complete = true;

    for (let page = 1; page <= maxPages; page += 1) {
        const response = await fetchHevyWorkoutEventsPage(
            apiKey,
            page,
            WORKOUT_EVENTS_PAGE_SIZE,
            since,
        );
        const events = response.events ?? [];

        if (events.length === 0) {
            break;
        }

        for (const event of events) {
            scanned += 1;

            if (event.type === "deleted") {
                if (await deleteBackedUpWorkoutByExternalId(db, userId, event.id)) {
                    deleted += 1;
                }
                continue;
            }

            const result = await importHevyWorkout(db, {
                userId,
                workout: event.workout,
                apiKey,
            });

            if (result.status === "error") {
                logSyncEvent(userId, "events_import_failed", {
                    page,
                    workoutId: event.workout.id,
                    message: result.message,
                });
                continue;
            }

            if (result.status === "inserted") {
                imported += 1;
            }
        }

        if (response.page_count != null && page >= response.page_count) {
            break;
        }

        if (page === maxPages) {
            complete = false;
        }
    }

    if (complete) {
        // Stamp the request's start, not "now": events raised while this pass
        // was running must still be picked up by the next one.
        await upsertHevyWorkoutsCountCursor(db, userId, { lastWorkoutEventsAt: startedAt });
    }

    logSyncEvent(userId, "events_sync_done", { since, scanned, imported, deleted, complete });

    return { scanned, imported, deleted, complete };
}
