// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Week Export against a **Hevy share import**: the sharer's **Hevy-native custom** IDs are theirs
 * alone, so each is minted as a **Custom movement** and created on the importing user's Hevy
 * account before upload (ADR 0022 sub-plan 4).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { User } from "@supabase/supabase-js";

type TTemplateRow = {
    id: string;
    title: string | null;
    type: string | null;
    equipment: string | null;
    primary_muscle_group: string | null;
    secondary_muscle_groups: string[] | null;
    is_custom: boolean | null;
};

const db = vi.hoisted(() => ({
    templateRows: [] as TTemplateRow[],
    /** Existing `canonical_exercises` rows, keyed by `${user_id}|${normalized_title}`. */
    canonicalByKey: new Map<string, string>(),
    canonicalInserts: [] as Record<string, unknown>[],
    mappingUpserts: [] as Record<string, unknown>[],
    canonicalInsertError: null as { code: string; message: string } | null,
}));

vi.mock("@/api/index", () => ({
    supabase: {
        from(table: string) {
            if (table === "hevy_exercise_templates") {
                return {
                    select: () => ({ in: async () => ({ data: db.templateRows, error: null }) }),
                };
            }

            if (table === "canonical_exercises") {
                const filters: Record<string, string> = {};
                const query = {
                    eq(column: string, value: string) {
                        filters[column] = value;
                        return query;
                    },
                    async maybeSingle() {
                        const id = db.canonicalByKey.get(
                            `${filters.user_id}|${filters.normalized_title}`,
                        );
                        return { data: id ? { id } : null, error: null };
                    },
                };
                return {
                    select: () => query,
                    insert: async (row: Record<string, unknown>) => {
                        if (db.canonicalInsertError) {
                            return { error: db.canonicalInsertError };
                        }
                        db.canonicalInserts.push(row);
                        db.canonicalByKey.set(
                            `${row.user_id}|${row.normalized_title}`,
                            String(row.id),
                        );
                        return { error: null };
                    },
                };
            }

            if (table === "canonical_exercise_mappings") {
                return {
                    upsert: async (row: Record<string, unknown>) => {
                        db.mappingUpserts.push(row);
                        return { error: null };
                    },
                };
            }

            throw new Error(`Unexpected table in test: ${table}`);
        },
    },
}));

import { resolveCustomExerciseTemplatesForHevyUpload } from "../hevy";

const SHARER_TEMPLATE_ID = "4dbbf2ee-4694-4f9a-835f-59c354d4cd3f";
const CREATED_HEVY_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const user = { id: "user-test" } as User;

const sharedTemplate: THevySharedTemplate = {
    title: "Shoulder CARs",
    exercise_type: "reps_only",
    equipment_category: "none",
    muscle_group: "shoulders",
    other_muscles: ["traps"],
};

/** One imported day holding a single exercise the share brought its own template for. */
function sharedRoutine(
    exerciseTemplateId: string,
    shared: THevySharedTemplate | null = sharedTemplate,
): THevyRoutine {
    return {
        id: "1",
        title: "Mobility",
        folder_id: 0,
        notes: "",
        exercises: [
            {
                index: 0,
                title: "Shoulder CARs",
                notes: "",
                rest_seconds: null,
                exercise_template_id: exerciseTemplateId,
                supersets_id: null,
                sets: [],
                ...(shared ? { shared_template: shared } : {}),
            },
        ],
    };
}

function hevyCustomTemplate(id: string, title: string) {
    return {
        id,
        title,
        type: "weight_reps",
        primary_muscle_group: "chest",
        secondary_muscle_groups: [],
        is_custom: true,
        equipment: "barbell",
        normalized_title: title.toLowerCase(),
        gif_id: "",
        instructions: [],
    };
}

/** Stubs the two Hevy endpoints the resolve path touches. */
function stubHevy(customs: ReturnType<typeof hevyCustomTemplate>[]) {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string | URL, init?: RequestInit) => {
            const u = typeof url === "string" ? url : url.toString();
            if (u.includes("/v1/exercise_templates") && init?.method === "POST") {
                return Promise.resolve(
                    new Response(CREATED_HEVY_ID, {
                        status: 200,
                        headers: { "Content-Type": "text/html; charset=utf-8" },
                    }),
                );
            }
            if (u.includes("/v1/exercise_templates?page=1")) {
                return Promise.resolve(
                    new Response(JSON.stringify({ exercise_templates: customs }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    }),
                );
            }
            return Promise.resolve(new Response("{}", { status: 500 }));
        }),
    );
}

function postCalls() {
    return (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c) => (c[1] as RequestInit)?.method === "POST",
    );
}

describe("resolveCustomExerciseTemplatesForHevyUpload - imported share customs", () => {
    beforeEach(() => {
        db.templateRows = [];
        db.canonicalByKey = new Map();
        db.canonicalInserts = [];
        db.mappingUpserts = [];
        db.canonicalInsertError = null;
        stubHevy([]);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("mints a Custom movement and creates the template on the user's Hevy account", async () => {
        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", [
            sharedRoutine(SHARER_TEMPLATE_ID),
        ]);

        expect(out.success).toBe(true);
        if (!out.success) return;
        expect(out.routines[0].exercises[0].exercise_template_id).toBe(CREATED_HEVY_ID);
        expect(out.createdNewHevyCustomTemplates).toBe(1);

        expect(postCalls()).toHaveLength(1);
        expect(JSON.parse(String(postCalls()[0][1]?.body))).toEqual({
            exercise: {
                title: "Shoulder CARs",
                exercise_type: "reps_only",
                equipment_category: "none",
                muscle_group: "shoulders",
                other_muscles: ["traps"],
            },
        });

        expect(db.canonicalInserts).toHaveLength(1);
        expect(db.canonicalInserts[0]).toMatchObject({
            user_id: "user-test",
            title: "Shoulder CARs",
            normalized_title: "shoulder cars",
            exercise_type: "reps_only",
            equipment: "none",
            primary_muscle_group: "shoulders",
            secondary_muscle_groups: ["traps"],
        });
    });

    it("maps the new Hevy template at the minted movement, never the sharer's id", async () => {
        await resolveCustomExerciseTemplatesForHevyUpload(user, "key", [
            sharedRoutine(SHARER_TEMPLATE_ID),
        ]);

        expect(db.mappingUpserts).toHaveLength(1);
        expect(db.mappingUpserts[0]).toMatchObject({
            source: "hevy",
            external_exercise_id: CREATED_HEVY_ID,
            canonical_exercise_id: db.canonicalInserts[0].id,
        });
    });

    it("leaves a template the mirror knows unchanged", async () => {
        db.templateRows = [
            {
                id: SHARER_TEMPLATE_ID,
                title: "Shoulder CARs",
                type: "reps_only",
                equipment: "none",
                primary_muscle_group: "shoulders",
                secondary_muscle_groups: [],
                is_custom: false,
            },
        ];

        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", [
            sharedRoutine(SHARER_TEMPLATE_ID),
        ]);

        expect(out.success).toBe(true);
        if (!out.success) return;
        expect(out.routines[0].exercises[0].exercise_template_id).toBe(SHARER_TEMPLATE_ID);
        expect(out.createdNewHevyCustomTemplates).toBe(0);
        expect(db.canonicalInserts).toHaveLength(0);
        expect(fetch).not.toHaveBeenCalled();
    });

    it("reuses the user's own Hevy custom of the same title instead of duplicating it", async () => {
        stubHevy([hevyCustomTemplate("hevy-existing-id", "  Shoulder CARs  ")]);

        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", [
            sharedRoutine(SHARER_TEMPLATE_ID),
        ]);

        expect(out.success).toBe(true);
        if (!out.success) return;
        expect(out.routines[0].exercises[0].exercise_template_id).toBe("hevy-existing-id");
        expect(out.createdNewHevyCustomTemplates).toBe(0);
        expect(postCalls()).toHaveLength(0);
        expect(db.mappingUpserts[0]).toMatchObject({ external_exercise_id: "hevy-existing-id" });
    });

    it("leaves the id alone when the template is already on the user's account", async () => {
        stubHevy([hevyCustomTemplate(SHARER_TEMPLATE_ID, "Shoulder CARs")]);

        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", [
            sharedRoutine(SHARER_TEMPLATE_ID),
        ]);

        expect(out.success).toBe(true);
        if (!out.success) return;
        expect(out.routines[0].exercises[0].exercise_template_id).toBe(SHARER_TEMPLATE_ID);
        expect(postCalls()).toHaveLength(0);
        expect(db.canonicalInserts).toHaveLength(0);
    });

    it("reuses an existing Custom movement rather than minting a second one", async () => {
        db.canonicalByKey.set("user-test|shoulder cars", "existing-canonical-id");

        await resolveCustomExerciseTemplatesForHevyUpload(user, "key", [
            sharedRoutine(SHARER_TEMPLATE_ID),
        ]);

        expect(db.canonicalInserts).toHaveLength(0);
        expect(db.mappingUpserts[0]).toMatchObject({
            canonical_exercise_id: "existing-canonical-id",
        });
    });

    it("still uploads when the Custom movement cannot be recorded", async () => {
        db.canonicalInsertError = { code: "42501", message: "permission denied" };

        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", [
            sharedRoutine(SHARER_TEMPLATE_ID),
        ]);

        expect(out.success).toBe(true);
        if (!out.success) return;
        expect(out.routines[0].exercises[0].exercise_template_id).toBe(CREATED_HEVY_ID);
        expect(db.mappingUpserts).toHaveLength(0);
    });

    it("passes an unmirrored id through when the share carried no metadata", async () => {
        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", [
            sharedRoutine(SHARER_TEMPLATE_ID, null),
        ]);

        expect(out.success).toBe(true);
        if (!out.success) return;
        expect(out.routines[0].exercises[0].exercise_template_id).toBe(SHARER_TEMPLATE_ID);
        expect(fetch).not.toHaveBeenCalled();
    });
});
