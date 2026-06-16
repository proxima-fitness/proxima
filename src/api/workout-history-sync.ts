/**
 * @module api/workout-history-sync
 *
 * Chunked Hevy workout backup orchestration: one request fetches one Hevy page
 * and imports each workout via {@link importHevyWorkout}. Cursor state lives on
 * `hevy_workouts_count` (`last_known_workout_count`, `sync_error`).
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

/**
 * Fetches one Hevy workouts page with exponential backoff on 429 / 5xx.
 */
async function fetchHevyWorkoutsPage(apiKey: string,page: number,pageSize: number): Promise<THevyWorkoutsResponse> {
    const url = `https://api.hevyapp.com/v1/workouts?page=${page}&pageSize=${pageSize}`;

    for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
        try {
            return await defaultFetch<THevyWorkoutsResponse>(url, apiKey);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "";
            const is429 = message.includes("Status: 429");
            const is5xx = /Status: 5\d\d/.test(message);
            const canRetry = is429 || is5xx;

            if (!canRetry || retry >= RATE_LIMIT_MAX_RETRIES) {
                throw error;
            }

            const waitMs = is429
                ? 60_000 * Math.pow(2, retry)
                : Math.min(8_000, 1_000 * Math.pow(2, retry));
            await delay(waitMs);
        }
    }

    throw new Error("Hevy workouts fetch failed after retries");
}

/**
 * Fetches live Hevy workout count with rate-limit backoff.
 */
async function fetchHevyWorkoutCount(apiKey: string): Promise<number> {
    const url = "https://api.hevyapp.com/v1/workouts/count";

    for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
        try {
            const response = await defaultFetch<{ workout_count: number }>(url, apiKey);
            return response.workout_count ?? 0;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "";
            const is429 = message.includes("Status: 429");
            const is5xx = /Status: 5\d\d/.test(message);
            const canRetry = is429 || is5xx;

            if (!canRetry || retry >= RATE_LIMIT_MAX_RETRIES) {
                throw error;
            }

            const waitMs = is429
                ? 60_000 * Math.pow(2, retry)
                : Math.min(8_000, 1_000 * Math.pow(2, retry));
            await delay(waitMs);
        }
    }

    throw new Error("Hevy workout count fetch failed after retries");
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
async function readSyncCursor(db: TWorkoutHistoryDb,userId: string): Promise<{ lastKnownWorkoutCount: number | null; syncError: string | null }> {
    const { data, error } = await db
        .from("hevy_workouts_count")
        .select("last_known_workout_count, sync_error")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return {
        lastKnownWorkoutCount: data?.last_known_workout_count ?? null,
        syncError: data?.sync_error ?? null,
    };
}

/**
 * Upserts `hevy_workouts_count` cursor fields for a user.
 */
export async function upsertHevyWorkoutsCountCursor(db: TWorkoutHistoryDb,userId: string,patch: { lastKnownWorkoutCount?: number; syncError?: string | null }): Promise<void> {
    const row: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
    };

    if (patch.lastKnownWorkoutCount !== undefined) {
        row.last_known_workout_count = patch.lastKnownWorkoutCount;
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
 * live count grew after a completed cursor.
 */
export function computeSyncPage(backedUpCount: number,lastKnownWorkoutCount: number | null,hevyCount: number,pageSize: number = WORKOUT_SYNC_PAGE_SIZE): number {
    const isDelta =
        lastKnownWorkoutCount !== null &&
        backedUpCount >= lastKnownWorkoutCount &&
        hevyCount > lastKnownWorkoutCount;

    if (isDelta) {
        return 1;
    }

    return Math.floor(backedUpCount / pageSize) + 1;
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
        const message =
            error instanceof Error ? error.message : "Failed to fetch Hevy workout count";
        await upsertHevyWorkoutsCountCursor(db, userId, { syncError: message });
        const backedUpCount = await countBackedUpWorkouts(db, userId);
        const { syncError } = await readSyncCursor(db, userId);
        return { backedUpCount, hevyCount: backedUpCount, syncError, done: false };
    }

    let backedUpCount = await countBackedUpWorkouts(db, userId);
    const { lastKnownWorkoutCount } = await readSyncCursor(db, userId);

    if (backedUpCount >= hevyCount) {
        await upsertHevyWorkoutsCountCursor(db, userId, {
            lastKnownWorkoutCount: hevyCount,
            syncError: null,
        });
        return { backedUpCount, hevyCount, syncError: null, done: true };
    }

    const page = computeSyncPage(backedUpCount, lastKnownWorkoutCount, hevyCount);

    let workoutsResponse: THevyWorkoutsResponse;
    try {
        workoutsResponse = await fetchHevyWorkoutsPage(apiKey, page, WORKOUT_SYNC_PAGE_SIZE);
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Failed to fetch Hevy workouts page";
        await upsertHevyWorkoutsCountCursor(db, userId, { syncError: message });
        const { syncError } = await readSyncCursor(db, userId);
        return { backedUpCount, hevyCount, syncError, done: false };
    }

    const workouts = workoutsResponse.workouts ?? [];
    if (workouts.length === 0) {
        const message = `Hevy returned no workouts for page ${page} while backup is incomplete`;
        await upsertHevyWorkoutsCountCursor(db, userId, { syncError: message });
        return { backedUpCount, hevyCount, syncError: message, done: false };
    }

    for (const workout of workouts) {
        const result = await importHevyWorkout(db, { userId, workout });
        if (result.status === "error") {
            await upsertHevyWorkoutsCountCursor(db, userId, { syncError: result.message });
            return {
                backedUpCount,
                hevyCount,
                syncError: result.message,
                done: false,
            };
        }
    }

    backedUpCount = await countBackedUpWorkouts(db, userId);

    if (backedUpCount >= hevyCount) {
        await upsertHevyWorkoutsCountCursor(db, userId, {
            lastKnownWorkoutCount: hevyCount,
            syncError: null,
        });
        return { backedUpCount, hevyCount, syncError: null, done: true };
    }

    await upsertHevyWorkoutsCountCursor(db, userId, { syncError: null });
    return { backedUpCount, hevyCount, syncError: null, done: false };
}

/**
 * Fire-and-forget first sync chunk after Hevy connect (browser only).
 */
export function triggerWorkoutHistorySync(): void {
    void fetch("/api/workout-history/sync", { method: "POST" });
}
