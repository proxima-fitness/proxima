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

    RATE_LIMIT_MAX_RETRIES,

} from "@/components/program-builder/api/hevy";

import {

    HEVY_WORKOUT_SOURCE,

    importHevyWorkout,

} from "./workout-history";



/** Workouts per Hevy API page for backup chunks. */

export const WORKOUT_SYNC_PAGE_SIZE = 10;



const WORKOUT_SYNC_LOG_PREFIX = "[workout-history-sync]";



/** Thrown when Hevy returns HTTP 429 — caller should back off (not persist as sync_error). */

export class HevyRateLimitError extends Error {

    constructor(message = "HTTP GET error! Status: 429") {

        super(message);

        this.name = "HevyRateLimitError";

    }

}



/** True when a Hevy fetch error is HTTP 429. */

export function isHevyRateLimitError(error: unknown): boolean {

    const message = error instanceof Error ? error.message : String(error);

    return message.includes("Status: 429");

}



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

export async function readSyncCursor(db: TWorkoutHistoryDb,userId: string): Promise<{ lastKnownWorkoutCount: number | null; lastSyncedPage: number | null; syncError: string | null }> {

    const { data, error } = await db

        .from("hevy_workouts_count")

        .select("last_known_workout_count, last_synced_page, sync_error")

        .eq("user_id", userId)

        .maybeSingle();



    if (error) {

        throw new Error(error.message);

    }



    return {

        lastKnownWorkoutCount: data?.last_known_workout_count ?? null,

        lastSyncedPage: data?.last_synced_page ?? null,

        syncError: data?.sync_error ?? null,

    };

}



/**

 * Upserts `hevy_workouts_count` cursor fields for a user.

 */

export async function upsertHevyWorkoutsCountCursor(db: TWorkoutHistoryDb,userId: string,patch: { lastKnownWorkoutCount?: number; lastSyncedPage?: number | null; syncError?: string | null }): Promise<void> {

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

        const result = await importHevyWorkout(db, { userId, workout });

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



/**

 * Runs one backup chunk for the authenticated user (browser only).

 */

export async function runWorkoutHistorySyncChunk(): Promise<TSyncChunkResult> {

    const response = await fetch("/api/workout-history/sync", { method: "POST" });

    if (!response.ok) {

        throw new Error("Failed to run workout history sync chunk");

    }

    const result = (await response.json()) as TSyncChunkResult;

    logWorkoutHistorySyncChunkResult(result);

    return result;

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


