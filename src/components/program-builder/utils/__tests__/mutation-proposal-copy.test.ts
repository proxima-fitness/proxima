/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import type { TAgentProgramOperation } from "@/components/program-builder/mutations/agentSchema";
import {
    buildMutationProposalRecipe,
    type TMutationProposalRecipe,
    type TMutationProposalStep,
} from "@/components/program-builder/utils/mutation-proposal-copy";

function withoutLocators(recipe: TMutationProposalRecipe): TMutationProposalRecipe {
    return {
        days: recipe.days.map((day) => ({
            ...day,
            steps: day.steps.map((step) => stripLocator(step)),
        })),
    };
}

function stripLocator(step: TMutationProposalStep): TMutationProposalStep {
    if (step.kind === "action") {
        return { kind: "action", text: step.text };
    }
    return { kind: "exercise", setRows: step.setRows, title: step.title };
}

const makeSet = (overrides: Partial<THevySets> & Pick<THevySets, "index">): THevySets => ({
    type: "normal",
    weight_kg: null,
    reps: 8,
    distance_meters: null,
    duration_seconds: null,
    rpe: 7,
    custom_metric: null,
    rep_range: null,
    ...overrides,
});

const makeExercise = (overrides: Partial<THevyExercise> = {}): THevyExercise => ({
    index: 0,
    title: "Romanian Deadlift",
    notes: "",
    rest_seconds: "90",
    exercise_template_id: "RDL",
    supersets_id: null,
    sets: [makeSet({ index: 0 }), makeSet({ index: 1 }), makeSet({ index: 2 })],
    ...overrides,
});

const makeDay = (overrides: Partial<THevyRoutine> = {}): THevyRoutine => ({
    id: "1",
    folder_id: 1,
    order: "1",
    title: "Upper Pull",
    notes: "",
    exercises: [makeExercise()],
    ...overrides,
});

describe("buildMutationProposalRecipe", () => {
    it("uses catalog titles instead of payload titles", () => {
        const catalog = new Map([
            ["RDL", "Romanian Deadlift"],
            ["SLC", "Seated Leg Curl"],
        ]);
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "swap_exercise_template",
                    from_exercise_template_id: "RDL",
                    folderIds: [1],
                    dayOrder: 1,
                    to: { exercise_template_id: "SLC", title: "Totally Fake Curl" },
                },
            ],
            [makeDay()],
            catalog,
        );

        expect(withoutLocators(recipe).days[0]?.steps).toEqual([
            { kind: "action", text: "Swap Romanian Deadlift for Seated Leg Curl" },
        ]);
    });

    it("does not show a payload title when the template is missing from the catalog", () => {
        const catalog = new Map([["OTHER", "Other Movement"]]);
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "insert_exercise",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 1,
                    exercise: {
                        exercise_template_id: "FAKE",
                        title: "Hallucinated Press",
                        sets: [makeSet({ index: 0 })],
                    },
                },
            ],
            [makeDay()],
            catalog,
        );

        expect(withoutLocators(recipe).days[0]?.steps).toEqual([
            { kind: "action", text: "Add FAKE" },
        ]);
        expect(JSON.stringify(recipe)).not.toContain("Hallucinated Press");
    });

    it("omits a swap or replace onto the same exercise title", () => {
        const swapSame = buildMutationProposalRecipe(
            [
                {
                    op: "swap_exercise_template",
                    from_exercise_template_id: "RDL",
                    folderIds: [1],
                    dayOrder: 1,
                    to: { exercise_template_id: "RDL", title: "Romanian Deadlift" },
                },
            ],
            [makeDay()],
        );
        const replaceSame = buildMutationProposalRecipe(
            [
                {
                    op: "edit_exercise",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    exercise: {
                        exercise_template_id: "RDL",
                        title: "Romanian Deadlift",
                        sets: [makeSet({ index: 0 })],
                    },
                },
            ],
            [makeDay()],
        );

        expect(swapSame).toEqual({ days: [] });
        expect(replaceSame).toEqual({ days: [] });
    });

    it("names a swap from the frozen grid, not template ids", () => {
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "swap_exercise_template",
                    from_exercise_template_id: "RDL",
                    folderIds: [1],
                    dayOrder: 1,
                    to: { exercise_template_id: "SLC", title: "Seated Leg Curl" },
                },
            ],
            [makeDay()],
        );

        expect(withoutLocators(recipe)).toEqual({
            days: [
                {
                    heading: "Week 2, Upper Pull",
                    steps: [
                        {
                            kind: "action",
                            text: "Swap Romanian Deadlift for Seated Leg Curl",
                        },
                    ],
                },
            ],
        });
    });

    it("names an insert from the payload title", () => {
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "insert_exercise",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 1,
                    exercise: {
                        exercise_template_id: "FP",
                        title: "Face Pull",
                        sets: [makeSet({ index: 0 })],
                    },
                },
            ],
            [makeDay()],
        );

        expect(withoutLocators(recipe)).toEqual({
            days: [
                {
                    heading: "Week 2, Upper Pull",
                    steps: [{ kind: "action", text: "Add Face Pull" }],
                },
            ],
        });
    });

    it("names a delete from the frozen exercise title", () => {
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "delete_exercise",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 0,
                },
            ],
            [makeDay()],
        );

        expect(withoutLocators(recipe)).toEqual({
            days: [
                {
                    heading: "Week 2, Upper Pull",
                    steps: [{ kind: "action", text: "Remove Romanian Deadlift" }],
                },
            ],
        });
    });

    it("reads update_set from-values off the frozen set and only names changed fields", () => {
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "update_set",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 0,
                    set: { reps: 6, rpe: 8 },
                },
            ],
            [makeDay()],
        );

        expect(withoutLocators(recipe)).toEqual({
            days: [
                {
                    heading: "Week 2, Upper Pull",
                    steps: [
                        {
                            kind: "exercise",
                            title: "Romanian Deadlift",
                            setRows: [
                                {
                                    setLabel: "Set 1",
                                    from: "8 reps @ RPE 7",
                                    to: "6 reps @ RPE 8",
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    });

    it("collapses consecutive sets with the same from→to into a range", () => {
        const recipe = buildMutationProposalRecipe(
            [0, 1, 2].map((setIndex) => ({
                op: "update_set",
                folderIds: [1],
                dayOrder: 1,
                exerciseIndex: 0,
                setIndex,
                set: { reps: 6, rpe: 8 },
            })),
            [makeDay()],
        );

        expect(withoutLocators(recipe).days[0]?.steps).toEqual([
            {
                kind: "exercise",
                title: "Romanian Deadlift",
                setRows: [
                    {
                        setLabel: "Sets 1-3",
                        from: "8 reps @ RPE 7",
                        to: "6 reps @ RPE 8",
                    },
                ],
            },
        ]);
    });

    it("names a day rename from the frozen title", () => {
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "edit_day_title",
                    folderIds: [1],
                    dayOrder: 1,
                    title: "Pull",
                },
            ],
            [makeDay()],
        );

        expect(withoutLocators(recipe)).toEqual({
            days: [
                {
                    heading: "Week 2, Upper Pull",
                    steps: [{ kind: "action", text: "Rename Upper Pull to Pull" }],
                },
            ],
        });
    });

    it("names delete day from the frozen title", () => {
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "delete_day",
                    folderIds: [1],
                    dayOrder: 1,
                },
            ],
            [makeDay()],
        );

        expect(withoutLocators(recipe)).toEqual({
            days: [
                {
                    heading: "Week 2, Upper Pull",
                    steps: [{ kind: "action", text: "Delete Upper Pull" }],
                },
            ],
        });
    });

    it("names delete week without a day title", () => {
        const recipe = buildMutationProposalRecipe(
            [{ op: "delete_week", folderIds: [1] }],
            [makeDay()],
        );

        expect(withoutLocators(recipe)).toEqual({
            days: [
                {
                    heading: "Week 2",
                    steps: [{ kind: "action", text: "Delete Week 2" }],
                },
            ],
        });
    });

    it("falls back when a day title is missing without throwing", () => {
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "delete_exercise",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 0,
                },
            ],
            [makeDay({ title: "" })],
        );

        expect(withoutLocators(recipe)).toEqual({
            days: [
                {
                    heading: "Week 2, Day 1",
                    steps: [{ kind: "action", text: "Remove Romanian Deadlift" }],
                },
            ],
        });
    });

    it("falls back to the template id when the exercise title is missing", () => {
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "delete_exercise",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 0,
                },
            ],
            [makeDay({ exercises: [makeExercise({ title: "" })] })],
        );

        expect(withoutLocators(recipe)).toEqual({
            days: [
                {
                    heading: "Week 2, Upper Pull",
                    steps: [{ kind: "action", text: "Remove RDL" }],
                },
            ],
        });
    });

    it("does not throw on streaming-partial ops", () => {
        const operations = [
            { op: "swap_exercise_template", from_exercise_template_id: "RDL" },
            { op: "delete_week" },
            { op: "add_day" },
            { op: "insert_exercise", folderIds: [1], dayOrder: 1, exerciseIndex: 0 },
            { op: "create_superset", folderIds: [1], dayOrder: 1 },
            { op: "update_set", folderIds: [1], dayOrder: 1, exerciseIndex: 0 },
        ] as TAgentProgramOperation[];

        expect(() => buildMutationProposalRecipe(operations, [makeDay()])).not.toThrow();
        expect(withoutLocators(buildMutationProposalRecipe(operations, [makeDay()]))).toEqual({
            days: [
                {
                    heading: "Week 2, Upper Pull",
                    steps: [
                        {
                            kind: "action",
                            text: "Swap Romanian Deadlift for …",
                        },
                        { kind: "action", text: "Add …" },
                        { kind: "action", text: "Create superset (…)" },
                    ],
                },
                {
                    heading: "",
                    steps: [
                        { kind: "action", text: "Delete week" },
                        { kind: "action", text: "Add day" },
                    ],
                },
            ],
        });
    });

    it("labels a partial week span as Weeks 2-4, not all weeks", () => {
        const program = [
            makeDay({ id: "w1", folder_id: 0 }),
            makeDay({ id: "w2", folder_id: 1 }),
            makeDay({ id: "w3", folder_id: 2 }),
            makeDay({ id: "w4", folder_id: 3 }),
        ];

        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "swap_exercise_template",
                    from_exercise_template_id: "RDL",
                    folderIds: [1, 2, 3],
                    dayOrder: 1,
                    to: { exercise_template_id: "SLC", title: "Seated Leg Curl" },
                },
            ],
            program,
        );

        expect(recipe.days[0]?.heading).toBe("Weeks 2-4, Upper Pull");
    });

    it("does not collapse non-consecutive sets", () => {
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "update_set",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 0,
                    set: { reps: 6 },
                },
                {
                    op: "update_set",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 2,
                    set: { reps: 6 },
                },
            ],
            [makeDay()],
        );

        expect(withoutLocators(recipe).days[0]?.steps).toEqual([
            {
                kind: "exercise",
                title: "Romanian Deadlift",
                setRows: [
                    { setLabel: "Set 1", from: "8 reps", to: "6 reps" },
                    { setLabel: "Set 3", from: "8 reps", to: "6 reps" },
                ],
            },
        ]);
    });

    it("keeps one multi-week swap as a single step when the after-state matches", () => {
        const program = [
            makeDay({ id: "w2", folder_id: 1, title: "Upper Pull" }),
            makeDay({ id: "w3", folder_id: 2, title: "Upper Pull" }),
            makeDay({ id: "w4", folder_id: 3, title: "Upper Pull" }),
        ];

        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "swap_exercise_template",
                    from_exercise_template_id: "RDL",
                    folderIds: [1, 2, 3],
                    dayOrder: 1,
                    to: { exercise_template_id: "SLC", title: "Seated Leg Curl" },
                },
            ],
            program,
        );

        expect(withoutLocators(recipe)).toEqual({
            days: [
                {
                    heading: "All weeks, Upper Pull",
                    steps: [
                        {
                            kind: "action",
                            text: "Swap Romanian Deadlift for Seated Leg Curl",
                        },
                    ],
                },
            ],
        });
    });

    it("builds the Week 2 / Week 3 recipe from a swap plus collapsed set ranges", () => {
        const week2 = makeDay({
            id: "w2",
            folder_id: 1,
            title: "Upper Pull",
            exercises: [
                makeExercise({
                    title: "Romanian Deadlift",
                    exercise_template_id: "RDL",
                    sets: [
                        makeSet({ index: 0, reps: 8, rpe: 7 }),
                        makeSet({ index: 1, reps: 8, rpe: 7 }),
                        makeSet({ index: 2, reps: 8, rpe: 7 }),
                    ],
                }),
            ],
        });
        const week3 = makeDay({
            id: "w3",
            folder_id: 2,
            title: "Upper Pull",
            exercises: [
                makeExercise({
                    title: "Seated Leg Curl",
                    exercise_template_id: "SLC",
                    sets: [
                        makeSet({ index: 0, reps: 6, rpe: 8 }),
                        makeSet({ index: 1, reps: 6, rpe: 8 }),
                        makeSet({ index: 2, reps: 6, rpe: 8 }),
                    ],
                }),
            ],
        });

        const updateSets = (
            folderId: number,
            reps: number,
            rpe: number,
        ): TAgentProgramOperation[] =>
            [0, 1, 2].map((setIndex) => ({
                op: "update_set" as const,
                folderIds: [folderId],
                dayOrder: 1,
                exerciseIndex: 0,
                setIndex,
                set: { reps, rpe },
            }));

        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "swap_exercise_template",
                    from_exercise_template_id: "RDL",
                    folderIds: [1],
                    dayOrder: 1,
                    to: { exercise_template_id: "SLC", title: "Seated Leg Curl" },
                },
                ...updateSets(1, 6, 8),
                ...updateSets(2, 5, 9),
            ],
            [week2, week3],
        );

        expect(withoutLocators(recipe)).toEqual({
            days: [
                {
                    heading: "Week 2, Upper Pull",
                    steps: [
                        {
                            kind: "action",
                            text: "Swap Romanian Deadlift for Seated Leg Curl",
                        },
                        {
                            kind: "exercise",
                            title: "Seated Leg Curl",
                            setRows: [
                                {
                                    setLabel: "Sets 1-3",
                                    from: "8 reps @ RPE 7",
                                    to: "6 reps @ RPE 8",
                                },
                            ],
                        },
                    ],
                },
                {
                    heading: "Week 3, Upper Pull",
                    steps: [
                        {
                            kind: "exercise",
                            title: "Seated Leg Curl",
                            setRows: [
                                {
                                    setLabel: "Sets 1-3",
                                    from: "6 reps @ RPE 8",
                                    to: "5 reps @ RPE 9",
                                },
                            ],
                        },
                    ],
                },
            ],
        });
    });

    it("puts a frozen locator on still-present swap, set-change, and remove steps", () => {
        const program = [
            makeDay({
                exercises: [
                    makeExercise({ builder_exercise_key: 4 }),
                    makeExercise({
                        index: 1,
                        title: "Face Pull",
                        exercise_template_id: "FP",
                        builder_exercise_key: 5,
                    }),
                ],
            }),
        ];

        const swap = buildMutationProposalRecipe(
            [
                {
                    op: "swap_exercise_template",
                    from_exercise_template_id: "RDL",
                    folderIds: [1],
                    dayOrder: 1,
                    to: { exercise_template_id: "SLC", title: "Seated Leg Curl" },
                },
            ],
            program,
        );
        expect(swap.days[0]?.steps[0]).toMatchObject({
            kind: "action",
            locator: { folderId: 1, dayOrder: 1, exerciseIndex: 0, builderExerciseKey: 4 },
        });

        const sets = buildMutationProposalRecipe(
            [
                {
                    op: "update_set",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 0,
                    set: { reps: 6 },
                },
            ],
            program,
        );
        expect(sets.days[0]?.steps[0]).toMatchObject({
            kind: "exercise",
            locator: { folderId: 1, dayOrder: 1, exerciseIndex: 0, builderExerciseKey: 4 },
        });

        const remove = buildMutationProposalRecipe(
            [
                {
                    op: "delete_exercise",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 1,
                },
            ],
            program,
        );
        expect(remove.days[0]?.steps[0]).toMatchObject({
            kind: "action",
            locator: { folderId: 1, dayOrder: 1, exerciseIndex: 1, builderExerciseKey: 5 },
        });
    });

    it("does not put a locator on a pending Add line", () => {
        const recipe = buildMutationProposalRecipe(
            [
                {
                    op: "insert_exercise",
                    folderIds: [1],
                    dayOrder: 1,
                    exerciseIndex: 1,
                    exercise: {
                        exercise_template_id: "FAKE",
                        title: "Face Pull",
                        sets: [makeSet({ index: 0 })],
                    },
                },
            ],
            [makeDay()],
        );

        expect(recipe.days[0]?.steps[0]).toEqual({ kind: "action", text: "Add Face Pull" });
        expect(recipe.days[0]?.steps[0] && "locator" in recipe.days[0].steps[0]).toBe(false);
    });
});
