import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { hevyBodyMeasurementFixture } from "./manual/hevy-body-measurement.fixture";
import {
    HEVY_BODY_MEASUREMENT_SOURCE,
    importHevyBodyMeasurement,
} from "../body-measurements";
import {
    computeBodyMeasurementsSyncPage,
    countBackedUpBodyMeasurements,
    estimateHevyBodyMeasurementCount,
    runBodyMeasurementsSyncChunk,
} from "../body-measurements-sync";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const API_KEY = "api-key-1111-2222-3333-4444-555555555555";

vi.mock("@/components/program-builder/api/hevy", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/components/program-builder/api/hevy")>();
    return {
        ...actual,
        defaultFetch: vi.fn(),
        delay: vi.fn(() => Promise.resolve()),
    };
});

vi.mock("../body-measurements", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../body-measurements")>();
    return {
        ...actual,
        importHevyBodyMeasurement: vi.fn(actual.importHevyBodyMeasurement),
    };
});

import { defaultFetch } from "@/components/program-builder/api/hevy";

type TTableName = "body_measurements" | "hevy_body_measurements_count";
type TRow = Record<string, unknown>;

function matchFilters(row: TRow, filters: Array<{ column: string; value: unknown }>): boolean {
    return filters.every((filter) => row[filter.column] === filter.value);
}

function createSyncMockDb(seed?: Partial<Record<TTableName, TRow[]>>) {
    const tables: Record<TTableName, TRow[]> = {
        body_measurements: [],
        hevy_body_measurements_count: [],
        ...seed,
    };

    const db = {
        from(table: TTableName) {
            const filters: Array<{ column: string; value: unknown }> = [];
            let head = false;
            let exactCount = false;
            let pendingUpsert: TRow | TRow[] | null = null;
            let selectCols: string | null = null;

            const builder = {
                select(_columns?: string, options?: { count?: string; head?: boolean }) {
                    selectCols = _columns ?? "*";
                    if (options?.head) head = true;
                    if (options?.count === "exact") exactCount = true;
                    return builder;
                },
                eq(column: string, value: unknown) {
                    filters.push({ column, value });
                    return builder;
                },
                upsert(row: TRow | TRow[]) {
                    pendingUpsert = row;
                    const rows = Array.isArray(row) ? row : [row];

                    if (table === "hevy_body_measurements_count") {
                        for (const incoming of rows) {
                            const userId = incoming.user_id as string;
                            const index = tables.hevy_body_measurements_count.findIndex(
                                (existing) => existing.user_id === userId,
                            );
                            if (index >= 0) {
                                tables.hevy_body_measurements_count[index] = {
                                    ...tables.hevy_body_measurements_count[index],
                                    ...incoming,
                                };
                            } else {
                                tables.hevy_body_measurements_count.push(incoming);
                            }
                        }
                        return builder;
                    }

                    for (const incoming of rows) {
                        const existingIndex = tables.body_measurements.findIndex(
                            (existing) =>
                                existing.user_id === incoming.user_id &&
                                existing.source === incoming.source &&
                                existing.external_id === incoming.external_id,
                        );
                        if (existingIndex >= 0) {
                            tables.body_measurements[existingIndex] = {
                                ...tables.body_measurements[existingIndex],
                                ...incoming,
                                id: tables.body_measurements[existingIndex].id,
                            };
                        } else {
                            tables.body_measurements.push({
                                id: `bm-${tables.body_measurements.length + 1}`,
                                ...incoming,
                            });
                        }
                    }
                    return builder;
                },
                async maybeSingle() {
                    if (pendingUpsert && table === "body_measurements") {
                        const incoming = Array.isArray(pendingUpsert)
                            ? pendingUpsert[0]
                            : pendingUpsert;
                        pendingUpsert = null;
                        const match = tables.body_measurements.find(
                            (row) =>
                                row.user_id === incoming.user_id &&
                                row.source === incoming.source &&
                                row.external_id === incoming.external_id,
                        );
                        return {
                            data: selectCols === "id" ? { id: match?.id } : match,
                            error: null,
                        };
                    }

                    const rows = tables[table].filter((row) => matchFilters(row, filters));
                    return { data: rows[0] ?? null, error: null };
                },
                then(resolve: (value: { count: number | null; error: null }) => void) {
                    if (head && exactCount) {
                        const count = tables[table].filter((row) =>
                            matchFilters(row, filters),
                        ).length;
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

function asDb(mock: unknown): SupabaseClient<Database> {
    return mock as SupabaseClient<Database>;
}

function measurement(date: string): THevyBodyMeasurement {
    return { ...hevyBodyMeasurementFixture, date };
}

describe("computeBodyMeasurementsSyncPage", () => {
    it("re-reads page 1 for delta when a prior walk completed", () => {
        expect(computeBodyMeasurementsSyncPage(10, 10, null, 10)).toBe(1);
    });

    it("walks backfill pages from backed-up count when no page cursor", () => {
        expect(computeBodyMeasurementsSyncPage(0, null, null, 10)).toBe(1);
        expect(computeBodyMeasurementsSyncPage(10, null, null, 10)).toBe(2);
        expect(computeBodyMeasurementsSyncPage(20, null, null, 10)).toBe(3);
    });

    it("advances from last_synced_page during an in-progress walk", () => {
        expect(computeBodyMeasurementsSyncPage(10, null, 1, 10)).toBe(2);
        expect(computeBodyMeasurementsSyncPage(20, 10, 2, 10)).toBe(3);
    });
});

describe("estimateHevyBodyMeasurementCount", () => {
    it("uses page_count * pageSize until the last page is known", () => {
        expect(estimateHevyBodyMeasurementCount(3, 10)).toBe(30);
        expect(estimateHevyBodyMeasurementCount(3, 10, { page: 2, pageLength: 10 })).toBe(30);
    });

    it("refines on the last page", () => {
        expect(estimateHevyBodyMeasurementCount(3, 10, { page: 3, pageLength: 4 })).toBe(24);
    });
});

describe("runBodyMeasurementsSyncChunk", () => {
    let mockDb: ReturnType<typeof createSyncMockDb>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDb = createSyncMockDb();
    });

    it("imports one page and reports not done when more pages remain", async () => {
        const pageOne = Array.from({ length: 10 }, (_, i) =>
            measurement(`2024-08-${String(14 - i).padStart(2, "0")}`),
        );

        vi.mocked(defaultFetch).mockResolvedValueOnce({
            page: 1,
            page_count: 3,
            body_measurements: pageOne,
        });

        const result = await runBodyMeasurementsSyncChunk(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.done).toBe(false);
        expect(result.backedUpCount).toBe(10);
        expect(result.hevyCount).toBe(30);
        expect(result.syncError).toBeNull();
        expect(mockDb.tables.body_measurements).toHaveLength(10);
        expect(mockDb.tables.hevy_body_measurements_count[0]).toMatchObject({
            user_id: USER_ID,
            last_synced_page: 1,
            sync_error: null,
        });
        expect(
            mockDb.tables.hevy_body_measurements_count[0]?.last_known_measurement_count,
        ).toBeUndefined();
    });

    it("multi-page backfill imports all rows; second run does not duplicate", async () => {
        const pageOne = Array.from({ length: 10 }, (_, i) =>
            measurement(`2024-09-${String(20 - i).padStart(2, "0")}`),
        );
        const pageTwo = Array.from({ length: 5 }, (_, i) =>
            measurement(`2024-08-${String(20 - i).padStart(2, "0")}`),
        );

        vi.mocked(defaultFetch)
            .mockResolvedValueOnce({
                page: 1,
                page_count: 2,
                body_measurements: pageOne,
            })
            .mockResolvedValueOnce({
                page: 2,
                page_count: 2,
                body_measurements: pageTwo,
            })
            .mockResolvedValueOnce({
                page: 1,
                page_count: 2,
                body_measurements: pageOne,
            });

        const first = await runBodyMeasurementsSyncChunk(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });
        expect(first.done).toBe(false);
        expect(first.backedUpCount).toBe(10);

        const second = await runBodyMeasurementsSyncChunk(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });
        expect(second.done).toBe(true);
        expect(second.backedUpCount).toBe(15);
        expect(second.hevyCount).toBe(15);
        expect(mockDb.tables.body_measurements).toHaveLength(15);
        expect(mockDb.tables.hevy_body_measurements_count[0]).toMatchObject({
            last_known_measurement_count: 15,
            last_known_page_count: 2,
            last_synced_page: null,
            sync_error: null,
        });

        const third = await runBodyMeasurementsSyncChunk(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });
        expect(third.done).toBe(true);
        expect(third.backedUpCount).toBe(15);
        expect(mockDb.tables.body_measurements).toHaveLength(15);
        expect(vi.mocked(importHevyBodyMeasurement).mock.calls.length).toBe(10 + 5 + 10);
    });

    it("sets sync_error on import failure without completing the walk", async () => {
        vi.mocked(defaultFetch).mockResolvedValueOnce({
            page: 1,
            page_count: 1,
            body_measurements: [hevyBodyMeasurementFixture],
        });
        vi.mocked(importHevyBodyMeasurement).mockResolvedValueOnce({
            status: "error",
            message: "upsert failed",
        });

        const result = await runBodyMeasurementsSyncChunk(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.syncError).toBe("upsert failed");
        expect(result.done).toBe(false);
        expect(mockDb.tables.hevy_body_measurements_count[0]).toMatchObject({
            user_id: USER_ID,
            sync_error: "upsert failed",
        });
        expect(
            mockDb.tables.hevy_body_measurements_count[0]?.last_known_measurement_count,
        ).toBeUndefined();
    });

    it("clears sync_error after a successful final chunk", async () => {
        mockDb.tables.hevy_body_measurements_count.push({
            user_id: USER_ID,
            sync_error: "old failure",
        });

        vi.mocked(defaultFetch).mockResolvedValueOnce({
            page: 1,
            page_count: 1,
            body_measurements: [hevyBodyMeasurementFixture],
        });

        const result = await runBodyMeasurementsSyncChunk(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.done).toBe(true);
        expect(result.syncError).toBeNull();
        expect(mockDb.tables.hevy_body_measurements_count[0]).toMatchObject({
            last_known_measurement_count: 1,
            last_known_page_count: 1,
            sync_error: null,
        });
    });

    it("delta re-reads page 1 and imports new dates after a completed walk", async () => {
        mockDb.tables.body_measurements.push({
            id: "bm-existing",
            user_id: USER_ID,
            source: HEVY_BODY_MEASUREMENT_SOURCE,
            external_id: hevyBodyMeasurementFixture.date,
            measured_on: hevyBodyMeasurementFixture.date,
        });
        mockDb.tables.hevy_body_measurements_count.push({
            user_id: USER_ID,
            last_known_measurement_count: 1,
            last_known_page_count: 1,
            last_synced_page: null,
        });

        const newer = measurement("2024-09-01");

        vi.mocked(defaultFetch).mockResolvedValueOnce({
            page: 1,
            page_count: 1,
            body_measurements: [newer, hevyBodyMeasurementFixture],
        });

        const result = await runBodyMeasurementsSyncChunk(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.done).toBe(true);
        expect(result.backedUpCount).toBe(2);
        expect(mockDb.tables.body_measurements).toHaveLength(2);
        expect(mockDb.tables.hevy_body_measurements_count[0]).toMatchObject({
            last_known_measurement_count: 2,
            last_synced_page: null,
        });
    });

    it("returns rateLimited without persisting sync_error on Hevy 429", async () => {
        vi.mocked(defaultFetch).mockRejectedValueOnce(new Error("HTTP GET error! Status: 429"));

        const result = await runBodyMeasurementsSyncChunk(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.rateLimited).toBe(true);
        expect(result.syncError).toBeNull();
        expect(result.done).toBe(false);
        expect(mockDb.tables.hevy_body_measurements_count).toHaveLength(0);
    });

    it("retries 5xx with short backoff before succeeding", async () => {
        vi.mocked(defaultFetch)
            .mockRejectedValueOnce(new Error("HTTP GET error! Status: 503"))
            .mockResolvedValueOnce({
                page: 1,
                page_count: 0,
                body_measurements: [],
            });

        const result = await runBodyMeasurementsSyncChunk(asDb(mockDb), {
            userId: USER_ID,
            apiKey: API_KEY,
        });

        expect(result.done).toBe(true);
        expect(result.hevyCount).toBe(0);
        expect(defaultFetch).toHaveBeenCalledTimes(2);
    });
});

describe("countBackedUpBodyMeasurements", () => {
    it("counts only hevy-source measurements for the user", async () => {
        const mockDb = createSyncMockDb({
            body_measurements: [
                { user_id: USER_ID, source: HEVY_BODY_MEASUREMENT_SOURCE },
                { user_id: USER_ID, source: HEVY_BODY_MEASUREMENT_SOURCE },
                { user_id: USER_ID, source: "other" },
                { user_id: "other-user", source: HEVY_BODY_MEASUREMENT_SOURCE },
            ],
        });

        const count = await countBackedUpBodyMeasurements(asDb(mockDb), USER_ID);
        expect(count).toBe(2);
    });
});
