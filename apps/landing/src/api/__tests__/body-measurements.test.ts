// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { hevyBodyMeasurementFixture } from "./manual/hevy-body-measurement.fixture";
import {
    HEVY_BODY_MEASUREMENT_SOURCE,
    importHevyBodyMeasurement,
    mapHevyBodyMeasurementToInsert,
} from "../body-measurements";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

type TRow = Record<string, unknown>;

function matchFilters(row: TRow, filters: Array<{ column: string; value: unknown }>): boolean {
    return filters.every((filter) => row[filter.column] === filter.value);
}

function createMockDb(seed?: TRow[]) {
    const rows: TRow[] = [...(seed ?? [])];

    const db = {
        from(table: string) {
            if (table !== "body_measurements") {
                throw new Error(`Unexpected table: ${table}`);
            }

            const filters: Array<{ column: string; value: unknown }> = [];
            let pendingUpsert: TRow | null = null;
            let selectCols: string | null = null;

            const builder = {
                select(columns?: string) {
                    selectCols = columns ?? "*";
                    if (pendingUpsert) {
                        // after upsert().select()
                        return builder;
                    }
                    return builder;
                },
                eq(column: string, value: unknown) {
                    filters.push({ column, value });
                    return builder;
                },
                upsert(row: TRow) {
                    pendingUpsert = row;
                    const existingIndex = rows.findIndex(
                        (r) =>
                            r.user_id === row.user_id &&
                            r.source === row.source &&
                            r.external_id === row.external_id,
                    );
                    if (existingIndex >= 0) {
                        rows[existingIndex] = {
                            ...rows[existingIndex],
                            ...row,
                            id: rows[existingIndex].id,
                        };
                    } else {
                        rows.push({
                            id: `bm-${rows.length + 1}`,
                            ...row,
                        });
                    }
                    return builder;
                },
                async maybeSingle() {
                    if (pendingUpsert) {
                        const match = rows.find(
                            (r) =>
                                r.user_id === pendingUpsert!.user_id &&
                                r.source === pendingUpsert!.source &&
                                r.external_id === pendingUpsert!.external_id,
                        );
                        pendingUpsert = null;
                        return {
                            data: selectCols === "id" ? { id: match?.id } : match,
                            error: null,
                        };
                    }
                    const matched = rows.filter((row) => matchFilters(row, filters));
                    return { data: matched[0] ?? null, error: null };
                },
            };

            return builder;
        },
        rows,
    };

    return db;
}

function asDb(mock: unknown): SupabaseClient<Database> {
    return mock as SupabaseClient<Database>;
}

describe("mapHevyBodyMeasurementToInsert", () => {
    it("maps Hevy fields with date as external_id", () => {
        const row = mapHevyBodyMeasurementToInsert(hevyBodyMeasurementFixture, USER_ID);

        expect(row).toEqual({
            user_id: USER_ID,
            source: HEVY_BODY_MEASUREMENT_SOURCE,
            external_id: "2024-08-14",
            measured_on: "2024-08-14",
            weight_kg: 80.5,
            lean_mass_kg: 65,
            fat_percent: 18.5,
            neck_cm: 38,
            shoulder_cm: 115,
            chest_cm: 95,
            left_bicep_cm: 35,
            right_bicep_cm: 35.5,
            left_forearm_cm: 28,
            right_forearm_cm: 28.5,
            abdomen: 85,
            waist: 80,
            hips: 95,
            left_thigh: 55,
            right_thigh: 55.5,
            left_calf: 37,
            right_calf: 37.5,
        });
    });

    it("nulls omitted optional fields", () => {
        const row = mapHevyBodyMeasurementToInsert(
            { date: "2025-01-01", weight_kg: 70 },
            USER_ID,
        );

        expect(row.weight_kg).toBe(70);
        expect(row.lean_mass_kg).toBeNull();
        expect(row.waist).toBeNull();
        expect(row.external_id).toBe("2025-01-01");
    });
});

describe("importHevyBodyMeasurement", () => {
    let mock: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mock = createMockDb();
    });

    it("upserts a new row", async () => {
        const result = await importHevyBodyMeasurement(asDb(mock), {
            userId: USER_ID,
            entry: hevyBodyMeasurementFixture,
        });

        expect(result).toEqual({ status: "upserted", id: "bm-1" });
        expect(mock.rows).toHaveLength(1);
        expect(mock.rows[0].weight_kg).toBe(80.5);
    });

    it("import twice → one row (idempotent upsert)", async () => {
        const first = await importHevyBodyMeasurement(asDb(mock), {
            userId: USER_ID,
            entry: hevyBodyMeasurementFixture,
        });
        const updated: THevyBodyMeasurement = {
            ...hevyBodyMeasurementFixture,
            weight_kg: 81.0,
        };
        const second = await importHevyBodyMeasurement(asDb(mock), {
            userId: USER_ID,
            entry: updated,
        });

        expect(first.status).toBe("upserted");
        expect(second.status).toBe("upserted");
        if (first.status === "upserted" && second.status === "upserted") {
            expect(second.id).toBe(first.id);
        }
        expect(mock.rows).toHaveLength(1);
        expect(mock.rows[0].weight_kg).toBe(81.0);
    });

    it("errors when date is missing", async () => {
        const result = await importHevyBodyMeasurement(asDb(mock), {
            userId: USER_ID,
            entry: { weight_kg: 80 } as THevyBodyMeasurement,
        });

        expect(result).toEqual({
            status: "error",
            message: "Hevy body measurement missing date",
        });
    });
});
