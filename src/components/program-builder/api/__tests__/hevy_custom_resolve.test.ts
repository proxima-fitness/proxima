import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { User } from "@supabase/supabase-js";

const supabaseRows = vi.hoisted(() => ({
    current: [] as Array<{
        id: string;
        title: string | null;
        type: string | null;
        equipment: string | null;
        primary_muscle_group: string | null;
        secondary_muscle_groups: string[] | null;
        is_custom: boolean | null;
    }>,
}));

vi.mock("@/api/index", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                in: vi.fn(async () => ({ data: supabaseRows.current, error: null })),
            })),
        })),
    },
}));

import { resolveCustomExerciseTemplatesForHevyUpload } from "../hevy";

const PROXIMA_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const user = { id: "user-test" } as User;

function minimalRoutine(exerciseTemplateId: string): THevyRoutine {
    return {
        id: "1",
        title: "1 - Day",
        folder_id: 0,
        notes: "",
        exercises: [
            {
                index: 0,
                title: "Exercise",
                notes: "",
                rest_seconds: null,
                exercise_template_id: exerciseTemplateId,
                supersets_id: null,
                sets: [],
            },
        ],
    };
}

describe("resolveCustomExerciseTemplatesForHevyUpload", () => {
    beforeEach(() => {
        supabaseRows.current = [];
        vi.stubGlobal(
            "fetch",
            vi.fn().mockImplementation((url: string | URL, init?: RequestInit) => {
                const u = typeof url === "string" ? url : url.toString();
                if (u.includes("/v1/exercise_templates") && init?.method === "POST") {
                    return Promise.resolve(
                        new Response("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", {
                            status: 200,
                            headers: { "Content-Type": "text/html; charset=utf-8" },
                        }),
                    );
                }
                if (u.includes("/v1/exercise_templates?page=1")) {
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                exercise_templates: [
                                    {
                                        id: "hevy-existing-id",
                                        title: "Matched Name",
                                        type: "weight_reps",
                                        primary_muscle_group: "chest",
                                        secondary_muscle_groups: [],
                                        is_custom: true,
                                        equipment: "barbell",
                                        normalized_title: "matched name",
                                        gif_id: "",
                                        instructions: [],
                                    },
                                ],
                            }),
                            { status: 200, headers: { "Content-Type": "application/json" } },
                        ),
                    );
                }
                return Promise.resolve(new Response("{}", { status: 500 }));
            }),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns routines unchanged when templates are global (not custom)", async () => {
        supabaseRows.current = [
            {
                id: PROXIMA_ID,
                title: "Back Squat",
                type: "weight_reps",
                equipment: "barbell",
                primary_muscle_group: "quadriceps",
                secondary_muscle_groups: [],
                is_custom: false,
            },
        ];
        const routines = [minimalRoutine(PROXIMA_ID)];
        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", routines);
        expect(out.success).toBe(true);
        if (!out.success) return;
        expect(out.createdNewHevyCustomTemplates).toBe(0);
        expect(out.routines[0].exercises[0].exercise_template_id).toBe(PROXIMA_ID);
    });

    it("passes through Hevy-native template ids not in the Supabase mirror (user customs from Hevy)", async () => {
        const hevyNativeId = "71059ed8-c8ff-45ab-84db-9f728f06d0cf";
        supabaseRows.current = [];
        const routines = [minimalRoutine(hevyNativeId)];
        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", routines);
        expect(out.success).toBe(true);
        if (!out.success) return;
        expect(out.createdNewHevyCustomTemplates).toBe(0);
        expect(out.routines[0].exercises[0].exercise_template_id).toBe(hevyNativeId);
        expect(fetch).not.toHaveBeenCalled();
    });

    it("remaps to existing Hevy custom exercise when titles match exactly (trimmed)", async () => {
        supabaseRows.current = [
            {
                id: PROXIMA_ID,
                title: "  Matched Name  ",
                type: "weight_reps",
                equipment: "barbell",
                primary_muscle_group: "chest",
                secondary_muscle_groups: [],
                is_custom: true,
            },
        ];
        const routines = [minimalRoutine(PROXIMA_ID)];
        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", routines);
        expect(out.success).toBe(true);
        if (!out.success) return;
        expect(out.createdNewHevyCustomTemplates).toBe(0);
        expect(out.routines[0].exercises[0].exercise_template_id).toBe("hevy-existing-id");
        expect(fetch).toHaveBeenCalled();
        const postCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
            (c) => typeof c[0] === "string" && c[0].includes("/v1/exercise_templates") && (c[1] as RequestInit)?.method === "POST",
        );
        expect(postCalls.length).toBe(0);
    });

    it("POSTs a new custom exercise and remaps to returned id when no title match", async () => {
        supabaseRows.current = [
            {
                id: PROXIMA_ID,
                title: "Brand New Custom",
                type: "weight_reps",
                equipment: "dumbbell",
                primary_muscle_group: "shoulders",
                secondary_muscle_groups: [],
                is_custom: true,
            },
        ];
        (fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string | URL, init?: RequestInit) => {
            const u = typeof url === "string" ? url : url.toString();
            if (u.includes("/v1/exercise_templates") && init?.method === "POST") {
                return Promise.resolve(
                    new Response("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", {
                        status: 200,
                        headers: { "Content-Type": "text/html; charset=utf-8" },
                    }),
                );
            }
            if (u.includes("/v1/exercise_templates?page=1")) {
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            exercise_templates: [
                                {
                                    id: "other",
                                    title: "Matched Name",
                                    type: "weight_reps",
                                    primary_muscle_group: "chest",
                                    secondary_muscle_groups: [],
                                    is_custom: true,
                                    equipment: "barbell",
                                    normalized_title: "",
                                    gif_id: "",
                                    instructions: [],
                                },
                            ],
                        }),
                        { status: 200, headers: { "Content-Type": "application/json" } },
                    ),
                );
            }
            return Promise.resolve(new Response("{}", { status: 500 }));
        });

        const routines = [minimalRoutine(PROXIMA_ID)];
        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", routines);
        expect(out.success).toBe(true);
        if (!out.success) return;
        expect(out.createdNewHevyCustomTemplates).toBe(1);
        expect(out.routines[0].exercises[0].exercise_template_id).toBe("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        const postCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
            (c) => typeof c[0] === "string" && c[0].includes("/v1/exercise_templates") && (c[1] as RequestInit)?.method === "POST",
        );
        expect(postCalls.length).toBe(1);
    });

    it("fails when multiple Hevy customs share the same title", async () => {
        supabaseRows.current = [
            {
                id: PROXIMA_ID,
                title: "Dup Name",
                type: "weight_reps",
                equipment: "barbell",
                primary_muscle_group: "chest",
                secondary_muscle_groups: [],
                is_custom: true,
            },
        ];
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        exercise_templates: [
                            {
                                id: "a",
                                title: "Dup Name",
                                type: "weight_reps",
                                primary_muscle_group: "chest",
                                secondary_muscle_groups: [],
                                is_custom: true,
                                equipment: "barbell",
                                normalized_title: "",
                                gif_id: "",
                                instructions: [],
                            },
                            {
                                id: "b",
                                title: "Dup Name",
                                type: "weight_reps",
                                primary_muscle_group: "chest",
                                secondary_muscle_groups: [],
                                is_custom: true,
                                equipment: "barbell",
                                normalized_title: "",
                                gif_id: "",
                                instructions: [],
                            },
                        ],
                    }),
                    { status: 200, headers: { "Content-Type": "application/json" } },
                ),
            ),
        );
        const routines = [minimalRoutine(PROXIMA_ID)];
        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", routines);
        expect(out.success).toBe(false);
        if (out.success !== false) return;
        expect(out.error.message).toContain("Multiple Hevy exercises named");
    });

    it("fails when Hevy custom exercise list cannot be loaded", async () => {
        supabaseRows.current = [
            {
                id: PROXIMA_ID,
                title: "Need List",
                type: "weight_reps",
                equipment: "barbell",
                primary_muscle_group: "chest",
                secondary_muscle_groups: [],
                is_custom: true,
            },
        ];
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(new Response("Bad Request", { status: 400 })),
        );
        const routines = [minimalRoutine(PROXIMA_ID)];
        const out = await resolveCustomExerciseTemplatesForHevyUpload(user, "key", routines);
        expect(out.success).toBe(false);
        if (out.success !== false) return;
        expect(out.error.message).toContain("Status: 400");
    });

    it("skips resolution when user is null", async () => {
        supabaseRows.current = [
            {
                id: PROXIMA_ID,
                title: "Matched Name",
                type: "weight_reps",
                equipment: "barbell",
                primary_muscle_group: "chest",
                secondary_muscle_groups: [],
                is_custom: true,
            },
        ];
        const routines = [minimalRoutine(PROXIMA_ID)];
        const out = await resolveCustomExerciseTemplatesForHevyUpload(null, "key", routines);
        expect(out.success).toBe(true);
        if (!out.success) return;
        expect(out.routines[0].exercises[0].exercise_template_id).toBe(PROXIMA_ID);
        expect(fetch).not.toHaveBeenCalled();
    });
});
