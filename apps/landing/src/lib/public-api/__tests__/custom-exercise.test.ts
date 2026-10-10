import { describe, expect, it } from "vitest";

import {
    createPublicApiCustomExercise,
    parseCreateCustomExerciseBody,
} from "../custom-exercise";
import type { TPublicApiExerciseDb } from "../canonical-exercises";
import {
    HEVY_EQUIPMENT_ORDER,
    HEVY_EXERCISE_TYPE_ORDER,
} from "@/components/program-builder/hevy/hevy-create-custom-exercise-options";
import { HEVY_MUSCLE_GROUP_ORDER } from "@/components/program-builder/hevy/hevy-muscle-group-labels";
import {
    PUBLIC_API_EQUIPMENT,
    PUBLIC_API_EXERCISE_TYPES,
    PUBLIC_API_MUSCLE_GROUPS,
} from "../openapi-schemas/exercises";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const EXISTING_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const VALID_BODY = {
    title: "Owner Custom Curl",
    exercise_type: "weight_reps",
    equipment: "dumbbell",
    primary_muscle_group: "biceps",
};

const DRAFT = {
    title: "Owner Custom Curl",
    exercise_type: "weight_reps",
    equipment: "dumbbell",
    primary_muscle_group: "biceps",
    secondary_muscle_groups: null,
};

type TMintRow = {
    id: string;
    user_id: string | null;
    title: string;
    normalized_title: string;
};

function asDb(mock: unknown): TPublicApiExerciseDb {
    return mock as TPublicApiExerciseDb;
}

/**
 * Lookup + insert for `mintCustomMovement`. Seed rows stay until insert.
 */
function mintDb(seed: TMintRow[]) {
    const rows = [...seed];
    let userIdFilter: string | null = null;
    let titleFilter: string | null = null;
    let lastInsert: Record<string, unknown> | null = null;

    const lookup = {
        select() {
            return lookup;
        },
        eq(column: string, value: string) {
            if (column === "user_id") {
                userIdFilter = value;
            }
            if (column === "normalized_title") {
                titleFilter = value;
            }
            return lookup;
        },
        async maybeSingle() {
            const match = rows.find(
                (row) =>
                    row.user_id === userIdFilter &&
                    row.normalized_title === titleFilter,
            );
            return { data: match ? { id: match.id } : null, error: null };
        },
    };

    return {
        lastInsert: () => lastInsert,
        client: asDb({
            from(table: string) {
                if (table !== "canonical_exercises") {
                    throw new Error(`Unexpected table: ${table}`);
                }
                return {
                    ...lookup,
                    async insert(row: Record<string, unknown>) {
                        lastInsert = row;
                        rows.push({
                            id: String(row.id),
                            user_id: row.user_id as string,
                            title: String(row.title),
                            normalized_title: String(row.normalized_title),
                        });
                        return { error: null };
                    },
                };
            },
        }),
    };
}

describe("parseCreateCustomExerciseBody", () => {
    it("accepts the Hevy create-form fields and trims title", () => {
        expect(
            parseCreateCustomExerciseBody({
                ...VALID_BODY,
                title: "  Owner Custom Curl  ",
                secondary_muscle_groups: ["forearms"],
            }),
        ).toEqual({
            ok: true,
            draft: {
                title: "Owner Custom Curl",
                exercise_type: "weight_reps",
                equipment: "dumbbell",
                primary_muscle_group: "biceps",
                secondary_muscle_groups: ["forearms"],
            },
        });
    });

    it("rejects a blank title and unknown Hevy-form slugs", () => {
        expect(parseCreateCustomExerciseBody({ ...VALID_BODY, title: "   " }).ok).toBe(
            false,
        );
        expect(
            parseCreateCustomExerciseBody({ ...VALID_BODY, exercise_type: "warmup" }).ok,
        ).toBe(false);
        expect(
            parseCreateCustomExerciseBody({ ...VALID_BODY, equipment: "cable" }).ok,
        ).toBe(false);
        expect(
            parseCreateCustomExerciseBody({
                ...VALID_BODY,
                primary_muscle_group: "pecs",
            }).ok,
        ).toBe(false);
        expect(
            parseCreateCustomExerciseBody({
                title: "Curl",
                exercise_type: "weight_reps",
                equipment: "dumbbell",
            }).ok,
        ).toBe(false);
    });

    it("uses the same exercise-type, equipment, and muscle slugs as the Hevy form", () => {
        expect(PUBLIC_API_EXERCISE_TYPES).toEqual(HEVY_EXERCISE_TYPE_ORDER);
        expect(PUBLIC_API_EQUIPMENT).toEqual(HEVY_EQUIPMENT_ORDER);
        expect(PUBLIC_API_MUSCLE_GROUPS).toEqual(HEVY_MUSCLE_GROUP_ORDER);
    });
});

describe("createPublicApiCustomExercise", () => {
    it("inserts a Custom exercise owned by the key holder, never a global", async () => {
        const db = mintDb([]);
        const id = await createPublicApiCustomExercise(db.client, USER_ID, DRAFT);

        expect(id).toEqual(expect.any(String));
        expect(db.lastInsert()).toMatchObject({
            user_id: USER_ID,
            title: "Owner Custom Curl",
            normalized_title: "owner custom curl",
            exercise_type: "weight_reps",
            equipment: "dumbbell",
            primary_muscle_group: "biceps",
            secondary_muscle_groups: null,
        });
        expect(db.lastInsert()?.user_id).not.toBeNull();
    });

    it("returns the existing id for a duplicate normalized title on that user", async () => {
        const db = mintDb([
            {
                id: EXISTING_ID,
                user_id: USER_ID,
                title: "owner custom curl",
                normalized_title: "owner custom curl",
            },
            {
                id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
                user_id: OTHER_ID,
                title: "Owner Custom Curl",
                normalized_title: "owner custom curl",
            },
        ]);

        const id = await createPublicApiCustomExercise(db.client, USER_ID, {
            ...DRAFT,
            title: "OWNER CUSTOM CURL",
        });

        expect(id).toBe(EXISTING_ID);
        expect(db.lastInsert()).toBeNull();
    });
});
