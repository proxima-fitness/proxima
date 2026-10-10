import { describe, it, expect, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import {
    DEFAULT_BODY_MEASUREMENTS_LIMIT,
    getBodyMeasurementsForUser,
    getLatestBodyMeasurement,
} from "../body-measurements-read";
import { HEVY_BODY_MEASUREMENT_SOURCE } from "../body-measurements";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OTHER_USER = "user-other-bbbb-cccc-dddd-eeeeeeeeeeee";

type TRow = Record<string, unknown>;

function measurement(
    overrides: Partial<TRow> & { id: string; measured_on: string; user_id?: string },
): TRow {
    return {
        user_id: USER_ID,
        source: HEVY_BODY_MEASUREMENT_SOURCE,
        external_id: overrides.measured_on,
        weight_kg: 80,
        lean_mass_kg: null,
        fat_percent: null,
        neck_cm: null,
        shoulder_cm: null,
        chest_cm: null,
        left_bicep_cm: null,
        right_bicep_cm: null,
        left_forearm_cm: null,
        right_forearm_cm: null,
        abdomen: null,
        waist: null,
        hips: null,
        left_thigh: null,
        right_thigh: null,
        left_calf: null,
        right_calf: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        ...overrides,
    };
}

function matchFilters(row: TRow, filters: Array<{ column: string; value: unknown }>): boolean {
    return filters.every((filter) => row[filter.column] === filter.value);
}

function createReadMockDb(seed: TRow[]) {
    const rows = [...seed];

    const db = {
        from(table: string) {
            if (table !== "body_measurements") {
                throw new Error(`Unexpected table: ${table}`);
            }

            const filters: Array<{ column: string; value: unknown }> = [];
            const gteFilters: Array<{ column: string; value: string }> = [];
            const lteFilters: Array<{ column: string; value: string }> = [];
            let orFilter: string | null = null;
            let limitN: number | null = null;
            const orderCols: Array<{ column: string; ascending: boolean }> = [];

            const applyFilters = (): TRow[] => {
                let result = rows.filter((row) => matchFilters(row, filters));
                for (const gte of gteFilters) {
                    result = result.filter((row) => String(row[gte.column]) >= gte.value);
                }
                for (const lte of lteFilters) {
                    result = result.filter((row) => String(row[lte.column]) <= lte.value);
                }
                if (orFilter) {
                    // measured_on.lt.X,and(measured_on.eq.X,id.lt.Y)
                    const ltMatch = orFilter.match(/measured_on\.lt\.([^,]+)/);
                    const eqAndId = orFilter.match(
                        /and\(measured_on\.eq\.([^,]+),id\.lt\.([^)]+)\)/,
                    );
                    if (ltMatch && eqAndId) {
                        const measuredLt = ltMatch[1];
                        const measuredEq = eqAndId[1];
                        const idLt = eqAndId[2];
                        result = result.filter((row) => {
                            const measured = String(row.measured_on);
                            const id = String(row.id);
                            return (
                                measured < measuredLt ||
                                (measured === measuredEq && id < idLt)
                            );
                        });
                    }
                }
                for (const order of orderCols) {
                    // handled below as multi-key sort
                    void order;
                }
                if (orderCols.length > 0) {
                    result = [...result].sort((a, b) => {
                        for (const order of orderCols) {
                            const av = String(a[order.column]);
                            const bv = String(b[order.column]);
                            if (av === bv) continue;
                            const cmp = av < bv ? -1 : 1;
                            return order.ascending ? cmp : -cmp;
                        }
                        return 0;
                    });
                }
                if (limitN != null) {
                    result = result.slice(0, limitN);
                }
                return result;
            };

            const builder = {
                select() {
                    return builder;
                },
                eq(column: string, value: unknown) {
                    filters.push({ column, value });
                    return builder;
                },
                gte(column: string, value: string) {
                    gteFilters.push({ column, value });
                    return builder;
                },
                lte(column: string, value: string) {
                    lteFilters.push({ column, value });
                    return builder;
                },
                or(filter: string) {
                    orFilter = filter;
                    return builder;
                },
                order(column: string, opts: { ascending: boolean }) {
                    orderCols.push({ column, ascending: opts.ascending });
                    return builder;
                },
                limit(n: number) {
                    limitN = n;
                    return builder;
                },
                async maybeSingle() {
                    const matched = applyFilters();
                    return { data: matched[0] ?? null, error: null };
                },
                then(
                    resolve: (value: { data: TRow[] | null; error: null }) => void,
                ) {
                    resolve({ data: applyFilters(), error: null });
                },
            };

            return builder;
        },
    };

    return db as typeof db;
}

function asDb(mock: unknown): SupabaseClient<Database> {
    return mock as SupabaseClient<Database>;
}

describe("getLatestBodyMeasurement", () => {
    it("returns newest date", async () => {
        const mock = createReadMockDb([
            measurement({ id: "a", measured_on: "2024-08-01", weight_kg: 79 }),
            measurement({ id: "b", measured_on: "2024-08-14", weight_kg: 80.5 }),
            measurement({ id: "c", measured_on: "2024-07-01", weight_kg: 81 }),
            measurement({
                id: "d",
                measured_on: "2024-08-20",
                weight_kg: 99,
                user_id: OTHER_USER,
            }),
        ]);

        const latest = await getLatestBodyMeasurement(asDb(mock), USER_ID);

        expect(latest?.id).toBe("b");
        expect(latest?.measured_on).toBe("2024-08-14");
        expect(latest?.weight_kg).toBe(80.5);
    });

    it("returns null when empty", async () => {
        const mock = createReadMockDb([]);
        const latest = await getLatestBodyMeasurement(asDb(mock), USER_ID);
        expect(latest).toBeNull();
    });
});

describe("getBodyMeasurementsForUser", () => {
    let mock: ReturnType<typeof createReadMockDb>;

    beforeEach(() => {
        mock = createReadMockDb([
            measurement({ id: "1", measured_on: "2024-08-14" }),
            measurement({ id: "2", measured_on: "2024-08-07" }),
            measurement({ id: "3", measured_on: "2024-08-01" }),
            measurement({ id: "4", measured_on: "2024-07-20" }),
        ]);
    });

    it("returns newest-first page with nextCursor when more exist", async () => {
        const page = await getBodyMeasurementsForUser(asDb(mock), USER_ID, { limit: 2 });

        expect(page.measurements.map((m) => m.id)).toEqual(["1", "2"]);
        expect(page.nextCursor).toEqual({ measuredOn: "2024-08-07", id: "2" });
    });

    it("respects since/until window", async () => {
        const page = await getBodyMeasurementsForUser(asDb(mock), USER_ID, {
            since: "2024-08-01",
            until: "2024-08-07",
        });

        expect(page.measurements.map((m) => m.measured_on)).toEqual([
            "2024-08-07",
            "2024-08-01",
        ]);
        expect(page.nextCursor).toBeNull();
    });

    it("defaults limit constant", () => {
        expect(DEFAULT_BODY_MEASUREMENTS_LIMIT).toBe(30);
    });
});
