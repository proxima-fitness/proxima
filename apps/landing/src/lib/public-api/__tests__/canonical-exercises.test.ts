// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import {
    DEFAULT_EXERCISE_PAGE_SIZE,
    MAX_EXERCISE_PAGE_SIZE,
    listPublicApiExercises,
    parseExerciseListQuery,
    type TPublicApiExerciseDb,
} from "@/lib/public-api/canonical-exercises";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

type TCatalogRow = {
    id: string;
    title: string;
    user_id: string | null;
    exercise_type: string | null;
    equipment: string | null;
    primary_muscle_group: string | null;
    secondary_muscle_groups: string[] | null;
};

const BENCH: TCatalogRow = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Bench Press",
    user_id: null,
    exercise_type: "weight_reps",
    equipment: "barbell",
    primary_muscle_group: "chest",
    secondary_muscle_groups: ["triceps"],
};

const SQUAT: TCatalogRow = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    title: "Squat",
    user_id: null,
    exercise_type: "weight_reps",
    equipment: "barbell",
    primary_muscle_group: "quadriceps",
    secondary_muscle_groups: null,
};

const ROW: TCatalogRow = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    title: "Row",
    user_id: null,
    exercise_type: "weight_reps",
    equipment: "dumbbell",
    primary_muscle_group: "lats",
    secondary_muscle_groups: ["biceps"],
};

const OWNER_CUSTOM: TCatalogRow = {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    title: "Owner Custom Curl",
    user_id: OWNER_ID,
    exercise_type: "weight_reps",
    equipment: "dumbbell",
    primary_muscle_group: "biceps",
    secondary_muscle_groups: null,
};

const OTHER_CUSTOM: TCatalogRow = {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    title: "Other Custom Fly",
    user_id: OTHER_ID,
    exercise_type: "weight_reps",
    equipment: "dumbbell",
    primary_muscle_group: "chest",
    secondary_muscle_groups: null,
};

function asDb(mock: unknown): TPublicApiExerciseDb {
    return mock as TPublicApiExerciseDb;
}

/**
 * Applies the same visibility + range the catalog query must send to PostgREST.
 * Seed rows stay in insertion order until `order` is recorded.
 */
function catalogDb(rows: TCatalogRow[]) {
    let visibility: "unset" | "globals" | { ownerId: string } = "unset";
    const orders: Array<{ column: string; ascending: boolean }> = [];
    let rangeFrom = 0;
    let rangeTo = Number.POSITIVE_INFINITY;

    const builder = {
        select() {
            return builder;
        },
        is(column: string, value: null) {
            if (column === "user_id" && value === null) {
                visibility = "globals";
            }
            return builder;
        },
        or(expression: string) {
            const match = /^user_id\.is\.null,user_id\.eq\.(.+)$/.exec(expression);
            if (match) {
                visibility = { ownerId: match[1] };
            }
            return builder;
        },
        order(column: string, options?: { ascending?: boolean }) {
            orders.push({ column, ascending: options?.ascending !== false });
            return builder;
        },
        range(from: number, to: number) {
            rangeFrom = from;
            rangeTo = to;
            return builder;
        },
        then(
            resolve: (value: { data: TCatalogRow[]; error: null }) => void,
        ) {
            let filtered = rows;
            if (visibility === "globals") {
                filtered = filtered.filter((row) => row.user_id === null);
            } else if (typeof visibility === "object") {
                const ownerId = visibility.ownerId;
                filtered = filtered.filter(
                    (row) => row.user_id === null || row.user_id === ownerId,
                );
            }

            const sorted = [...filtered].sort((left, right) => {
                for (const { column, ascending } of orders) {
                    const leftValue = String(left[column as keyof TCatalogRow] ?? "");
                    const rightValue = String(right[column as keyof TCatalogRow] ?? "");
                    if (leftValue === rightValue) {
                        continue;
                    }
                    return ascending
                        ? leftValue.localeCompare(rightValue)
                        : rightValue.localeCompare(leftValue);
                }
                return 0;
            });

            resolve({
                data: sorted.slice(rangeFrom, rangeTo + 1),
                error: null,
            });
        },
    };

    return asDb({
        from(table: string) {
            if (table !== "canonical_exercises") {
                throw new Error(`Unexpected table: ${table}`);
            }
            return builder;
        },
    });
}

describe("parseExerciseListQuery", () => {
    it("defaults to page 1 and page_size 50", () => {
        expect(parseExerciseListQuery(new URLSearchParams())).toEqual({
            ok: true,
            page: 1,
            pageSize: DEFAULT_EXERCISE_PAGE_SIZE,
        });
    });

    it("rejects page 0, oversized page_size, and non-integers", () => {
        expect(parseExerciseListQuery(new URLSearchParams("page=0"))).toEqual({
            ok: false,
            error: "page must be a positive integer",
        });
        expect(
            parseExerciseListQuery(new URLSearchParams(`page_size=${MAX_EXERCISE_PAGE_SIZE + 1}`)),
        ).toEqual({
            ok: false,
            error: `page_size must be an integer from 1 to ${MAX_EXERCISE_PAGE_SIZE}`,
        });
        expect(parseExerciseListQuery(new URLSearchParams("page=1.5"))).toEqual({
            ok: false,
            error: "page must be a positive integer",
        });
    });
});

describe("listPublicApiExercises", () => {
    const seed = [SQUAT, OTHER_CUSTOM, BENCH, OWNER_CUSTOM, ROW];

    it("unauthenticated list is globals only, title-ordered, and never includes user_id", async () => {
        const result = await listPublicApiExercises(catalogDb(seed), {
            userId: null,
            page: 1,
            pageSize: 50,
        });

        expect(result).toEqual({
            exercises: [
                {
                    id: BENCH.id,
                    title: "Bench Press",
                    exercise_type: "weight_reps",
                    equipment: "barbell",
                    primary_muscle_group: "chest",
                    secondary_muscle_groups: ["triceps"],
                },
                {
                    id: ROW.id,
                    title: "Row",
                    exercise_type: "weight_reps",
                    equipment: "dumbbell",
                    primary_muscle_group: "lats",
                    secondary_muscle_groups: ["biceps"],
                },
                {
                    id: SQUAT.id,
                    title: "Squat",
                    exercise_type: "weight_reps",
                    equipment: "barbell",
                    primary_muscle_group: "quadriceps",
                    secondary_muscle_groups: null,
                },
            ],
            page: 1,
            page_size: 50,
            has_more: false,
        });
        for (const exercise of result!.exercises) {
            expect(exercise).not.toHaveProperty("user_id");
        }
    });

    it("keyed list includes that user's Custom exercises and never another user's", async () => {
        const result = await listPublicApiExercises(catalogDb(seed), {
            userId: OWNER_ID,
            page: 1,
            pageSize: 50,
        });

        expect(result?.exercises.map((exercise) => exercise.id)).toEqual([
            BENCH.id,
            OWNER_CUSTOM.id,
            ROW.id,
            SQUAT.id,
        ]);
        expect(result?.exercises.some((exercise) => exercise.id === OTHER_CUSTOM.id)).toBe(false);
    });

    it("paginates with has_more from a page_size+1 fetch", async () => {
        const first = await listPublicApiExercises(catalogDb(seed), {
            userId: null,
            page: 1,
            pageSize: 2,
        });
        const second = await listPublicApiExercises(catalogDb(seed), {
            userId: null,
            page: 2,
            pageSize: 2,
        });

        expect(first).toEqual({
            exercises: [
                expect.objectContaining({ id: BENCH.id, title: "Bench Press" }),
                expect.objectContaining({ id: ROW.id, title: "Row" }),
            ],
            page: 1,
            page_size: 2,
            has_more: true,
        });
        expect(second).toEqual({
            exercises: [expect.objectContaining({ id: SQUAT.id, title: "Squat" })],
            page: 2,
            page_size: 2,
            has_more: false,
        });
    });
});
