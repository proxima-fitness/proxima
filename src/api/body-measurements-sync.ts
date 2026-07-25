/**
 * @module api/body-measurements-sync
 *
 * Chunked Hevy body-measurements backup: one request fetches one Hevy page and
 * imports each entry via {@link importHevyBodyMeasurement}.
 *
 * Cursor strategy (no Hevy `/body_measurements/count`):
 * - Cursor table `hevy_body_measurements_count`: `last_known_measurement_count`,
 *   `last_synced_page`, `last_known_page_count`, `sync_error`.
 * - Backfill walks pages 1..page_count (newest-first) via `last_synced_page`.
 * - `hevyCount` for progress is estimated from `page_count` × page size, refined
 *   on the last page to `(page_count - 1) * pageSize + pageLength`.
 * - Done when the last page is imported: clear `last_synced_page`, store
 *   backed-up row count + observed `page_count`.
 * - Delta: when idle (`last_synced_page` null) and a prior walk completed, re-read
 *   page 1 only (newest-first; same spirit as workout delta). Upserts refresh
 *   recent entries; new dates grow the backed-up count.
 *
 * Depends on: api/body-measurements, program-builder/api/hevy (fetch + rate limits)
 * Used by: POST /api/body-measurements/sync, ConnectHevyDialog kickoff
 */
import {
    defaultFetch,
    delay,
    HevyRateLimitError,
    isHevyRateLimitError,
    RATE_LIMIT_MAX_RETRIES,
} from "@/components/program-builder/api/hevy";
import {
    HEVY_BODY_MEASUREMENT_SOURCE,
    HEVY_BODY_MEASUREMENTS_PAGE_SIZE,
    importHevyBodyMeasurement,
} from "./body-measurements";

/** Body measurements per Hevy API page for backup chunks (API max 10). */
export const BODY_MEASUREMENTS_SYNC_PAGE_SIZE = HEVY_BODY_MEASUREMENTS_PAGE_SIZE;

const SYNC_LOG_PREFIX = "[body-measurements-sync]";

/** Delay between fire-and-forget backfill chunks after Hevy connect. */
export const BODY_MEASUREMENTS_SYNC_POLL_DELAY_MS = 2_000;

/** Base delay before retrying after Hevy 429 (client exponential backoff). */
export const BODY_MEASUREMENTS_SYNC_RATE_LIMIT_POLL_DELAY_MS = 60_000;

/** Cap for client 429 backoff (60s → 120s → 240s → 480s). */
export const BODY_MEASUREMENTS_SYNC_RATE_LIMIT_MAX_DELAY_MS = 480_000;

function logSyncEvent(userId: string, event: string, details: Record<string, unknown>): void {
    console.info(`${SYNC_LOG_PREFIX} ${event}`, { userId, ...details });
}

/** Browser-friendly log for chunk results (DevTools console). */
export function logBodyMeasurementsSyncChunkResult(result: TSyncChunkResult): void {
    if (result.rateLimited) {
        console.info(`${SYNC_LOG_PREFIX} rate_limited`, {
            backedUpCount: result.backedUpCount,
            hevyCount: result.hevyCount,
        });
        return;
    }

    if (result.chunk) {
        console.info(`${SYNC_LOG_PREFIX} chunk`, {
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

    console.info(`${SYNC_LOG_PREFIX} status`, {
        backedUpCount: result.backedUpCount,
        hevyCount: result.hevyCount,
        done: result.done,
        syncError: result.syncError,
    });
}

/**
 * GET with 5xx retry (short backoff). 429 fails fast so the client loop can
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
    db: TBodyMeasurementsDb,
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
    await upsertBodyMeasurementsSyncCursor(db, userId, { syncError: message });
    const { syncError } = await readBodyMeasurementsSyncCursor(db, userId);
    return { backedUpCount, hevyCount, syncError, done: false };
}

/**
 * Fetches one Hevy body-measurements page (429 → fast fail; 5xx → short retry).
 */
async function fetchHevyBodyMeasurementsPage(
    apiKey: string,
    page: number,
    pageSize: number,
): Promise<THevyBodyMeasurementsResponse> {
    const url = `https://api.hevyapp.com/v1/body_measurements?page=${page}&pageSize=${pageSize}`;
    return fetchHevyGetWithRetry<THevyBodyMeasurementsResponse>(url, apiKey);
}

/**
 * Estimates live Hevy measurement count from list pagination metadata.
 * Refined when the last page length is known; otherwise uses page_count × pageSize.
 */
export function estimateHevyBodyMeasurementCount(
    pageCount: number,
    pageSize: number,
    options?: { page?: number; pageLength?: number },
): number {
    if (pageCount <= 0) {
        return 0;
    }

    if (
        options?.page !== undefined &&
        options.pageLength !== undefined &&
        options.page >= pageCount
    ) {
        return (pageCount - 1) * pageSize + options.pageLength;
    }

    return pageCount * pageSize;
}

/**
 * Counts backed-up Hevy body measurements for a user.
 */
export async function countBackedUpBodyMeasurements(
    db: TBodyMeasurementsDb,
    userId: string,
): Promise<number> {
    const { count, error } = await db
        .from("body_measurements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("source", HEVY_BODY_MEASUREMENT_SOURCE);

    if (error) {
        throw new Error(error.message);
    }

    return count ?? 0;
}

export type TBodyMeasurementsSyncCursor = {
    lastKnownMeasurementCount: number | null;
    lastSyncedPage: number | null;
    lastKnownPageCount: number | null;
    syncError: string | null;
};

/**
 * Reads sync cursor row from `hevy_body_measurements_count`.
 */
export async function readBodyMeasurementsSyncCursor(
    db: TBodyMeasurementsDb,
    userId: string,
): Promise<TBodyMeasurementsSyncCursor> {
    const { data, error } = await db
        .from("hevy_body_measurements_count")
        .select(
            "last_known_measurement_count, last_synced_page, last_known_page_count, sync_error",
        )
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return {
        lastKnownMeasurementCount: data?.last_known_measurement_count ?? null,
        lastSyncedPage: data?.last_synced_page ?? null,
        lastKnownPageCount: data?.last_known_page_count ?? null,
        syncError: data?.sync_error ?? null,
    };
}

/**
 * Upserts `hevy_body_measurements_count` cursor fields for a user.
 */
export async function upsertBodyMeasurementsSyncCursor(
    db: TBodyMeasurementsDb,
    userId: string,
    patch: {
        lastKnownMeasurementCount?: number;
        lastSyncedPage?: number | null;
        lastKnownPageCount?: number | null;
        syncError?: string | null;
    },
): Promise<void> {
    const row: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
    };

    if (patch.lastKnownMeasurementCount !== undefined) {
        row.last_known_measurement_count = patch.lastKnownMeasurementCount;
    }
    if (patch.lastSyncedPage !== undefined) {
        row.last_synced_page = patch.lastSyncedPage;
    }
    if (patch.lastKnownPageCount !== undefined) {
        row.last_known_page_count = patch.lastKnownPageCount;
    }
    if (patch.syncError !== undefined) {
        row.sync_error = patch.syncError;
    }

    const { error } = await db
        .from("hevy_body_measurements_count")
        .upsert(row, { onConflict: "user_id" });

    if (error) {
        throw new Error(error.message);
    }
}

/**
 * Chooses the Hevy body-measurements page for the next sync chunk.
 *
 * In-progress walks advance `last_synced_page + 1`. Idle after a completed walk
 * re-reads page 1 (delta). Otherwise resume from backed-up count / page size.
 */
export function computeBodyMeasurementsSyncPage(
    backedUpCount: number,
    lastKnownMeasurementCount: number | null,
    lastSyncedPage: number | null = null,
    pageSize: number = BODY_MEASUREMENTS_SYNC_PAGE_SIZE,
): number {
    if (lastSyncedPage !== null) {
        return lastSyncedPage + 1;
    }

    if (lastKnownMeasurementCount !== null) {
        return 1;
    }

    return Math.floor(backedUpCount / pageSize) + 1;
}

function buildChunkMeta(
    page: number,
    pageCount: number,
    inserted: number,
    skipped: number,
): TSyncChunkResult["chunk"] {
    return { page, pageCount, inserted, skipped };
}

/**
 * Imports one Hevy body-measurements page for a user.
 * Safe to retry; does not clear the in-progress page cursor until the walk finishes.
 */
export async function runBodyMeasurementsSyncChunk(
    db: TBodyMeasurementsDb,
    params: { userId: string; apiKey: string },
): Promise<TSyncChunkResult> {
    const { userId, apiKey } = params;

    let backedUpCount = await countBackedUpBodyMeasurements(db, userId);
    const cursor = await readBodyMeasurementsSyncCursor(db, userId);
    const page = computeBodyMeasurementsSyncPage(
        backedUpCount,
        cursor.lastKnownMeasurementCount,
        cursor.lastSyncedPage,
    );

    logSyncEvent(userId, "chunk_start", {
        page,
        lastSyncedPage: cursor.lastSyncedPage,
        backedUpCount,
        lastKnownMeasurementCount: cursor.lastKnownMeasurementCount,
        lastKnownPageCount: cursor.lastKnownPageCount,
    });

    let pageResponse: THevyBodyMeasurementsResponse;
    try {
        pageResponse = await fetchHevyBodyMeasurementsPage(
            apiKey,
            page,
            BODY_MEASUREMENTS_SYNC_PAGE_SIZE,
        );
    } catch (error: unknown) {
        const hevyCount =
            cursor.lastKnownMeasurementCount ??
            estimateHevyBodyMeasurementCount(
                cursor.lastKnownPageCount ?? 0,
                BODY_MEASUREMENTS_SYNC_PAGE_SIZE,
            );
        return handleHevyFetchFailure(db, userId, error, backedUpCount, hevyCount);
    }

    const pageCount = pageResponse.page_count ?? 0;
    const entries = pageResponse.body_measurements ?? [];
    const hevyCount = estimateHevyBodyMeasurementCount(
        pageCount,
        BODY_MEASUREMENTS_SYNC_PAGE_SIZE,
        { page, pageLength: entries.length },
    );

    // Empty account or empty last page after a completed walk → idle done.
    if (pageCount === 0 || (entries.length === 0 && page === 1 && cursor.lastSyncedPage === null)) {
        await upsertBodyMeasurementsSyncCursor(db, userId, {
            lastKnownMeasurementCount: backedUpCount,
            lastSyncedPage: null,
            lastKnownPageCount: pageCount,
            syncError: null,
        });
        logSyncEvent(userId, "already_synced_empty", { backedUpCount, hevyCount: 0 });
        return { backedUpCount, hevyCount: 0, syncError: null, done: true };
    }

    if (entries.length === 0) {
        const message = `Hevy returned no body measurements for page ${page} while backup is incomplete`;
        logSyncEvent(userId, "empty_page", { page, pageCount, backedUpCount, hevyCount, message });
        await upsertBodyMeasurementsSyncCursor(db, userId, { syncError: message });
        return { backedUpCount, hevyCount, syncError: message, done: false };
    }

    const countBeforePage = backedUpCount;

    for (const entry of entries) {
        const result = await importHevyBodyMeasurement(db, { userId, entry });

        if (result.status === "error") {
            logSyncEvent(userId, "import_failed", {
                page,
                date: entry.date,
                message: result.message,
            });
            await upsertBodyMeasurementsSyncCursor(db, userId, { syncError: result.message });
            return {
                backedUpCount,
                hevyCount,
                syncError: result.message,
                done: false,
                chunk: buildChunkMeta(page, pageCount, 0, 0),
            };
        }
    }

    backedUpCount = await countBackedUpBodyMeasurements(db, userId);
    const newRows = Math.max(0, backedUpCount - countBeforePage);
    const skipped = Math.max(0, entries.length - newRows);
    const chunk = buildChunkMeta(page, pageCount, newRows, skipped);
    const refinedHevyCount = estimateHevyBodyMeasurementCount(
        pageCount,
        BODY_MEASUREMENTS_SYNC_PAGE_SIZE,
        { page, pageLength: entries.length },
    );

    logSyncEvent(userId, "chunk_complete", {
        ...chunk,
        backedUpCount,
        hevyCount: refinedHevyCount,
        lastSyncedPageNext: page,
    });

    const walkComplete = page >= pageCount;
    // Idle delta only refreshes page 1 (newest-first); no full re-walk.
    const wasIdleDelta =
        cursor.lastSyncedPage === null && cursor.lastKnownMeasurementCount !== null;

    if (walkComplete || wasIdleDelta) {
        await upsertBodyMeasurementsSyncCursor(db, userId, {
            lastKnownMeasurementCount: backedUpCount,
            lastSyncedPage: null,
            lastKnownPageCount: pageCount,
            syncError: null,
        });
        return {
            backedUpCount,
            hevyCount: refinedHevyCount,
            syncError: null,
            done: true,
            chunk,
        };
    }

    await upsertBodyMeasurementsSyncCursor(db, userId, {
        lastSyncedPage: page,
        syncError: null,
    });
    return {
        backedUpCount,
        hevyCount: refinedHevyCount,
        syncError: null,
        done: false,
        chunk,
    };
}

/**
 * Client poll delay after a rate-limited chunk (exponential on consecutive 429s).
 */
export function bodyMeasurementsSyncRateLimitPollDelayMs(consecutiveRateLimits: number): number {
    const attempt = Math.max(1, consecutiveRateLimits);
    const nextDelay =
        BODY_MEASUREMENTS_SYNC_RATE_LIMIT_POLL_DELAY_MS * Math.pow(2, attempt - 1);
    return Math.min(nextDelay, BODY_MEASUREMENTS_SYNC_RATE_LIMIT_MAX_DELAY_MS);
}

/**
 * Runs one backup chunk for the authenticated user (browser only).
 */
export async function runBodyMeasurementsSyncChunkRequest(): Promise<TSyncChunkResult> {
    const response = await fetch("/api/body-measurements/sync", { method: "POST" });

    if (!response.ok) {
        throw new Error("Failed to run body measurements sync chunk");
    }

    const result = (await response.json()) as TSyncChunkResult;
    logBodyMeasurementsSyncChunkResult(result);
    return result;
}

/**
 * Fire-and-forget backfill after Hevy connect (browser only).
 * Loops chunks until done, sync error, or give-up — no separate poller UI.
 */
export function triggerBodyMeasurementsSync(): void {
    void (async () => {
        let consecutiveRateLimits = 0;
        for (;;) {
            try {
                const result = await runBodyMeasurementsSyncChunkRequest();

                if (result.rateLimited) {
                    consecutiveRateLimits += 1;
                    await delay(bodyMeasurementsSyncRateLimitPollDelayMs(consecutiveRateLimits));
                    continue;
                }

                consecutiveRateLimits = 0;
                if (result.done || result.syncError) {
                    return;
                }

                await delay(BODY_MEASUREMENTS_SYNC_POLL_DELAY_MS);
            } catch (error: unknown) {
                console.error(`${SYNC_LOG_PREFIX} trigger_failed`, error);
                return;
            }
        }
    })();
}
