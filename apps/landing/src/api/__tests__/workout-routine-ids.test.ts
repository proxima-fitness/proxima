// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Workout routine-id read for Day complete (ADR 0011 SoT / 0013 A7).
 */
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import { getWorkoutRoutineIds } from "../workout-routine-ids";

const USER_ID = "user-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const OTHER_USER_ID = "user-bbbbbbbb-cccc-dddd-eeee-ffffffffffff";

type TRow = { user_id: string; routine_id: string | null };

function createMockDb(rows: TRow[]) {
    const db = {
        from(table: string) {
            if (table !== "workouts") {
                throw new Error(`Unexpected table: ${table}`);
            }
            const filters: Array<{ column: string; value: unknown }> = [];
            const notNullCols: string[] = [];

            const builder = {
                select() {
                    return builder;
                },
                eq(column: string, value: unknown) {
                    filters.push({ column, value });
                    return builder;
                },
                not(column: string, operator: string, value: unknown) {
                    if (operator === "is" && value === null) {
                        notNullCols.push(column);
                    }
                    return builder;
                },
                then(
                    resolve: (value: { data: Array<{ routine_id: string }>; error: null }) => void,
                ) {
                    let matched = rows.filter((row) =>
                        filters.every(
                            (filter) => row[filter.column as keyof TRow] === filter.value,
                        ),
                    );
                    for (const col of notNullCols) {
                        matched = matched.filter((row) => row[col as keyof TRow] != null);
                    }
                    resolve({
                        data: matched.map((row) => ({ routine_id: row.routine_id as string })),
                        error: null,
                    });
                },
            };
            return builder;
        },
    };
    return db;
}

function asDb(mock: unknown): SupabaseClient<Database> {
    return mock as SupabaseClient<Database>;
}

describe("getWorkoutRoutineIds", () => {
    it("returns distinct non-null routine ids for the user", async () => {
        const ids = await getWorkoutRoutineIds(
            USER_ID,
            asDb(
                createMockDb([
                    { user_id: USER_ID, routine_id: "a" },
                    { user_id: USER_ID, routine_id: "a" },
                    { user_id: USER_ID, routine_id: "b" },
                    { user_id: USER_ID, routine_id: null },
                    { user_id: OTHER_USER_ID, routine_id: "c" },
                ]),
            ),
        );
        expect(ids).toEqual(["a", "b"]);
    });

    it("returns empty when the user has no linked sessions", async () => {
        const ids = await getWorkoutRoutineIds(
            USER_ID,
            asDb(createMockDb([{ user_id: USER_ID, routine_id: null }])),
        );
        expect(ids).toEqual([]);
    });
});
