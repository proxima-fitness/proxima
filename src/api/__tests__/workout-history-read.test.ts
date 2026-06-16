import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { HEVY_WORKOUT_SOURCE } from "../workout-history";
import {
    DEFAULT_ENSURE_FRESH_MAX_CHUNKS,
    ensureWorkoutHistoryFresh,
    getSyncProgress,
} from "../workout-history-read";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const API_KEY = "api-key-1111-2222-3333-4444-555555555555";

vi.mock("../workout-history-sync", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../workout-history-sync")>();
    return {
        ...actual,
        countBackedUpWorkouts: vi.fn(actual.countBackedUpWorkouts),
        fetchHevyWorkoutCount: vi.fn(),
        runSyncChunk: vi.fn(),
    };
});

import {
    countBackedUpWorkouts,
    fetchHevyWorkoutCount,
    runSyncChunk,
} from "../workout-history-sync";

type TTableName = "workouts" | "hevy_workouts_count";

type TRow = Record<string, unknown>;

function matchFilters(row: TRow, filters: Array<{ column: string; value: unknown }>): boolean {
    return filters.every((filter) => row[filter.column] === filter.value);
}

function createReadMockDb(seed?: Partial<Record<TTableName, TRow[]>>) {
    const tables: Record<TTableName, TRow[]> = {
        workouts: [],
        hevy_workouts_count: [],
        ...seed,
    };

    const db = {
        from(table: TTableName) {
            const filters: Array<{ column: string; value: unknown }> = [];
            let head = false;
            let exactCount = false;

            const builder = {
                select(_columns?: string, options?: { count?: string; head?: boolean }) {
                    if (options?.head) head = true;
                    if (options?.count === "exact") exactCount = true;
                    return builder;
                },
                eq(column: string, value: unknown) {
                    filters.push({ column, value });
                    return builder;
                },
                async maybeSingle() {
                    const rows = tables[table].filter((row) => matchFilters(row, filters));
                    return { data: rows[0] ?? null, error: null };
                },
                then(resolve: (value: { count: number | null; error: null }) => void) {
                    if (head && exactCount) {
                        const count = tables[table].filter((row) => matchFilters(row, filters)).length;
                        resolve({ count, error: null });
                        return;
                    }
                    resolve({ count: null, error: null });
                },
            };

            return builder;
        },
        tables,
    };

    return db as typeof db & { tables: typeof tables };
}

function asDb(mock: ReturnType<typeof createReadMockDb>): SupabaseClient<Database> {
    return mock as unknown as SupabaseClient<Database>;
}

describe("getSyncProgress", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns backed-up count and cursor-derived hevy count without api key", async () => {
        const mockDb = createReadMockDb({
            workouts: [
                { user_id: USER_ID, source: HEVY_WORKOUT_SOURCE },
                { user_id: USER_ID, source: HEVY_WORKOUT_SOURCE },
            ],
            hevy_workouts_count: [
                {
                    user_id: USER_ID,
                    last_known_workout_count: 5,
                    sync_error: null,
                },
            ],
        });

        const progress = await getSyncProgress(asDb(mockDb), USER_ID);

        expect(progress).toEqual({
            backedUpCount: 2,
            hevyCount: 5,
            syncError: null,
        });
        expect(fetchHevyWorkoutCount).not.toHaveBeenCalled();
    });

    it("uses live hevy count when api key is provided", async () => {
        const mockDb = createReadMockDb({
            workouts: [{ user_id: USER_ID, source: HEVY_WORKOUT_SOURCE }],
            hevy_workouts_count: [
                {
                    user_id: USER_ID,
                    last_known_workout_count: 1,
                    sync_error: null,
                },
            ],
        });

        vi.mocked(fetchHevyWorkoutCount).mockResolvedValueOnce(10);

        const progress = await getSyncProgress(asDb(mockDb), USER_ID, { apiKey: API_KEY });

        expect(progress.hevyCount).toBe(10);
        expect(progress.backedUpCount).toBe(1);
    });

    it("falls back to cursor estimate when live count fetch fails", async () => {
        const mockDb = createReadMockDb({
            workouts: [{ user_id: USER_ID, source: HEVY_WORKOUT_SOURCE }],
            hevy_workouts_count: [
                {
                    user_id: USER_ID,
                    last_known_workout_count: 8,
                    sync_error: "rate limited",
                },
            ],
        });

        vi.mocked(fetchHevyWorkoutCount).mockRejectedValueOnce(new Error("429"));

        const progress = await getSyncProgress(asDb(mockDb), USER_ID, { apiKey: API_KEY });

        expect(progress).toEqual({
            backedUpCount: 1,
            hevyCount: 8,
            syncError: "rate limited",
        });
    });
});

describe("ensureWorkoutHistoryFresh", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("stops after first chunk when already caught up", async () => {
        const mockDb = createReadMockDb();
        vi.mocked(runSyncChunk).mockResolvedValueOnce({
            backedUpCount: 10,
            hevyCount: 10,
            syncError: null,
            done: true,
        });

        const result = await ensureWorkoutHistoryFresh(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.done).toBe(true);
        expect(runSyncChunk).toHaveBeenCalledTimes(1);
    });

    it("loops chunks until done", async () => {
        const mockDb = createReadMockDb();
        vi.mocked(runSyncChunk)
            .mockResolvedValueOnce({
                backedUpCount: 8,
                hevyCount: 10,
                syncError: null,
                done: false,
            })
            .mockResolvedValueOnce({
                backedUpCount: 10,
                hevyCount: 10,
                syncError: null,
                done: true,
            });

        const result = await ensureWorkoutHistoryFresh(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.done).toBe(true);
        expect(runSyncChunk).toHaveBeenCalledTimes(2);
    });

    it("stops on sync error without further chunks", async () => {
        const mockDb = createReadMockDb();
        vi.mocked(runSyncChunk).mockResolvedValueOnce({
            backedUpCount: 3,
            hevyCount: 10,
            syncError: "insert failed",
            done: false,
        });

        const result = await ensureWorkoutHistoryFresh(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.syncError).toBe("insert failed");
        expect(runSyncChunk).toHaveBeenCalledTimes(1);
    });

    it("respects maxChunks cap", async () => {
        const mockDb = createReadMockDb();
        vi.mocked(runSyncChunk).mockResolvedValue({
            backedUpCount: 1,
            hevyCount: 100,
            syncError: null,
            done: false,
        });

        const result = await ensureWorkoutHistoryFresh(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
            maxChunks: 2,
        });

        expect(result.done).toBe(false);
        expect(runSyncChunk).toHaveBeenCalledTimes(2);
    });

    it("defaults to DEFAULT_ENSURE_FRESH_MAX_CHUNKS", async () => {
        const mockDb = createReadMockDb();
        vi.mocked(runSyncChunk).mockResolvedValue({
            backedUpCount: 1,
            hevyCount: 100,
            syncError: null,
            done: false,
        });

        await ensureWorkoutHistoryFresh(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(runSyncChunk).toHaveBeenCalledTimes(DEFAULT_ENSURE_FRESH_MAX_CHUNKS);
    });
});

describe("countBackedUpWorkouts integration", () => {
    it("is used by getSyncProgress for backed-up count", async () => {
        const mockDb = createReadMockDb({
            workouts: [
                { user_id: USER_ID, source: HEVY_WORKOUT_SOURCE },
                { user_id: USER_ID, source: "other" },
            ],
        });

        const count = await countBackedUpWorkouts(asDb(mockDb), USER_ID);
        expect(count).toBe(1);
    });
});
