import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import {
    addExerciseFormToInsertPayload,
    editExercise,
    editExerciseFromDialog,
    swapExerciseTemplate,
    updateSet,
} from "../handlers";
import { applyOperation } from "../apply";
import { resolveExercisePayload } from "../resolveExercisePayload";
import { isValidationFailure } from "../types";

const mockTemplate: THevyExerciseTemplate = {
    id: "bench-1",
    title: "Bench Press",
    type: "weight_reps",
    primary_muscle_group: "chest",
    secondary_muscle_groups: [],
    is_custom: false,
    equipment: "barbell",
    normalized_title: "bench press",
    gif_id: "gif-1",
    instructions: [],
};

const makeSet = (overrides: Partial<THevySets> & Pick<THevySets, "index">): THevySets => ({
    type: "normal",
    weight_kg: null,
    reps: 8,
    distance_meters: null,
    duration_seconds: null,
    rpe: 8,
    custom_metric: null,
    rep_range: null,
    ...overrides,
});

const makeExercise = (overrides: Partial<THevyExercise> = {}): THevyExercise => ({
    index: 0,
    title: "Bench Press",
    notes: "Keep elbows tucked",
    reason: "Primary horizontal press",
    rest_seconds: "90",
    exercise_template_id: "bench-1",
    supersets_id: 0,
    sets: [makeSet({ index: 0 }), makeSet({ index: 1 }), makeSet({ index: 2 })],
    ...overrides,
});

const makeDay = (overrides: Partial<THevyRoutine> = {}): THevyRoutine => ({
    id: "1",
    folder_id: 0,
    order: "1",
    title: "Push",
    notes: "",
    exercises: [makeExercise()],
    ...overrides,
});

const gridPayload = {
    exercise_template_id: "ohp-1",
    title: "Overhead Press",
    rest_seconds: "120",
    reason: "Vertical push",
    sets: [makeSet({ index: 0, reps: 6 }), makeSet({ index: 1, reps: 6 })],
};

describe("editExercise", () => {
    it("preserves notes and superset membership", () => {
        const program = [makeDay()];
        const next = editExercise(program, [0], 1, 0, gridPayload);

        expect(next[0].exercises[0].notes).toBe("Keep elbows tucked");
        expect(next[0].exercises[0].supersets_id).toBe(0);
    });

    it("replaces template, title, sets, rest, and reason from payload", () => {
        const program = [makeDay()];
        const next = editExercise(program, [0], 1, 0, gridPayload);

        const exercise = next[0].exercises[0];
        expect(exercise.exercise_template_id).toBe("ohp-1");
        expect(exercise.title).toBe("Overhead Press");
        expect(exercise.rest_seconds).toBe("120");
        expect(exercise.reason).toBe("Vertical push");
        expect(exercise.sets).toHaveLength(2);
        expect(exercise.sets[0].reps).toBe(6);
    });

    it("clears reason when payload omits it", () => {
        const program = [makeDay()];
        const { reason: _reason, ...payloadWithoutReason } = gridPayload;
        const next = editExercise(program, [0], 1, 0, payloadWithoutReason);

        expect(next[0].exercises[0].reason).toBeUndefined();
    });

    it("keeps the Builder exercise key across a full replace", () => {
        const program = [makeDay({ exercises: [makeExercise({ builder_exercise_key: 11 })] })];
        const next = editExercise(program, [0], 1, 0, gridPayload);

        expect(next[0].exercises[0].builder_exercise_key).toBe(11);
    });
});

describe("editExerciseFromDialog", () => {
    it("converts dialog form via addExerciseFormToInsertPayload", () => {
        const program = [makeDay()];
        const dialog: THevyDialog = {
            isOpen: false,
            folder_id: 0,
            dayOrder: 1,
            exerciseIndex: 0,
            editExercise: {
                selectedExercise: mockTemplate,
                repTypeValue: "reps",
                reps: [10, 10, 10],
                weightKg: null,
                rpe: null,
                setTypes: ["normal", "normal", "normal"],
                restSeconds: "60",
            },
        };

        const next = editExerciseFromDialog(program, dialog);
        const expected = addExerciseFormToInsertPayload(dialog.editExercise!);

        expect(next[0].exercises[0].exercise_template_id).toBe(expected.exercise_template_id);
        expect(next[0].exercises[0].title).toBe(expected.title);
        expect(next[0].exercises[0].sets).toHaveLength(3);
        expect(next[0].exercises[0].notes).toBe("Keep elbows tucked");
    });

    it("stringifies numeric restSeconds from a Hevy-loaded dialog", () => {
        const dialogExercise: object = {
            selectedExercise: mockTemplate,
            repTypeValue: "reps",
            reps: [8, 8],
            weightKg: null,
            rpe: null,
            setTypes: ["normal", "normal"],
            restSeconds: 90,
        };
        const payload = addExerciseFormToInsertPayload(dialogExercise as THevyAddExercise);

        expect(payload.rest_seconds).toBe("90");
    });
});

describe("swapExerciseTemplate", () => {
    const multiWeekProgram = (): THevyRoutine[] =>
        Array.from({ length: 16 }, (_, index) =>
            makeDay({
                id: String(index + 1),
                folder_id: Math.floor(index / 4),
                order: String((index % 4) + 1),
                exercises: [makeExercise({ exercise_template_id: "BENCH_BB" })],
            }),
        );

    it("swaps all matching exercises across weeks and days when scope omitted", () => {
        const { program: next, matchCount } = swapExerciseTemplate(
            multiWeekProgram(),
            "BENCH_BB",
            { exercise_template_id: "3601968B", title: "DB Bench" },
        );

        expect(matchCount).toBe(16);
        expect(next.every((day) => day.exercises[0].exercise_template_id === "3601968B")).toBe(true);
        expect(next.every((day) => day.exercises[0].title === "DB Bench")).toBe(true);
        expect(next[0].exercises[0].sets.length).toBeGreaterThan(0);
        expect(next[0].exercises[0].rest_seconds).toBe("90");
        expect(next[0].exercises[0].notes).toBe("Keep elbows tucked");
    });

    it("respects folderIds and dayOrder scope", () => {
        const program = multiWeekProgram();
        const { program: next, matchCount } = swapExerciseTemplate(
            program,
            "BENCH_BB",
            { exercise_template_id: "3601968B", title: "DB Bench" },
            { folderIds: [0, 1], dayOrder: 2 },
        );

        expect(matchCount).toBe(2);
        expect(next.filter((day) => day.exercises[0].exercise_template_id === "3601968B")).toHaveLength(2);
        expect(program.filter((day) => day.folder_id === 2)[0].exercises[0].exercise_template_id).toBe("BENCH_BB");
    });

    it("preserve_sets false replaces sets and rest but keeps notes", () => {
        const program = [makeDay()];
        const { program: next, matchCount } = swapExerciseTemplate(
            program,
            "bench-1",
            {
                exercise_template_id: "3601968B",
                title: "DB Bench",
                rest_seconds: "60",
                sets: [makeSet({ index: 0, reps: 12 })],
            },
            { preserveSets: false },
        );

        expect(matchCount).toBe(1);
        expect(next[0].exercises[0].sets).toHaveLength(1);
        expect(next[0].exercises[0].sets[0].reps).toBe(12);
        expect(next[0].exercises[0].rest_seconds).toBe("60");
        expect(next[0].exercises[0].notes).toBe("Keep elbows tucked");
    });

    it("keeps the Builder exercise key on a full replace", () => {
        const program = [makeDay({ exercises: [makeExercise({ builder_exercise_key: 14 })] })];
        const { program: next } = swapExerciseTemplate(
            program,
            "bench-1",
            {
                exercise_template_id: "3601968B",
                title: "DB Bench",
                rest_seconds: "60",
                sets: [makeSet({ index: 0, reps: 12 })],
            },
            { preserveSets: false },
        );

        expect(next[0].exercises[0].builder_exercise_key).toBe(14);
    });

    it("keeps existing reason when to.reason omitted", () => {
        const program = [makeDay()];
        const { program: next } = swapExerciseTemplate(program, "bench-1", {
            exercise_template_id: "3601968B",
            title: "DB Bench",
        });

        expect(next[0].exercises[0].reason).toBe("Primary horizontal press");
    });

    it("drops a share's mint metadata with the template id it described", () => {
        const sharedTemplate: THevySharedTemplate = {
            title: "Shoulder CARs",
            exercise_type: "reps_only",
            equipment_category: "none",
            muscle_group: "shoulders",
            other_muscles: [],
        };
        const program = [makeDay({ exercises: [makeExercise({ shared_template: sharedTemplate })] })];

        const swapped = swapExerciseTemplate(program, "bench-1", {
            exercise_template_id: "3601968B",
            title: "DB Bench",
        }).program;
        expect(swapped[0].exercises[0].shared_template).toBeUndefined();

        // A swap that changes no identity leaves Week Export what it needs to mint.
        const sameId = swapExerciseTemplate(program, "bench-1", {
            exercise_template_id: "bench-1",
            title: "Bench Press",
        }).program;
        expect(sameId[0].exercises[0].shared_template).toEqual(sharedTemplate);
    });

    it("overwrites reason when to.reason provided", () => {
        const program = [makeDay()];
        const { program: next } = swapExerciseTemplate(program, "bench-1", {
            exercise_template_id: "3601968B",
            title: "DB Bench",
            reason: "Dumbbell-only.",
        });

        expect(next[0].exercises[0].reason).toBe("Dumbbell-only.");
    });

    it("zero matches fail via applyOperation", () => {
        const result = applyOperation([makeDay()], {
            op: "swap_exercise_template",
            from_exercise_template_id: "MISSING",
            preserve_sets: true,
            to: { exercise_template_id: "3601968B", title: "DB Bench" },
        });

        expect(isValidationFailure(result)).toBe(true);
        if (!isValidationFailure(result)) return;
        expect(result.reason).toContain("No exercise matched from_exercise_template_id MISSING");
    });
});

describe("updateSet", () => {
    it("does not throw when exercise slot at index is undefined", () => {
        const program = [
            makeDay({
                exercises: [
                    makeExercise(),
                    undefined,
                ] as THevyExercise[],
            }),
        ];

        expect(() =>
            updateSet(program, [0], 1, 1, 0, { reps: 10 }),
        ).not.toThrow();

        const next = updateSet(program, [0], 1, 1, 0, { reps: 10 });
        expect(next[0].exercises[1]).toBeUndefined();
    });
});

describe("resolveExercisePayload", () => {
    it("overwrites a payload title with the catalog title", () => {
        const catalog = new Map([["ohp-1", "Overhead Press"]]);
        const result = resolveExercisePayload(
            {
                exercise_template_id: "ohp-1",
                title: "Totally Wrong Name",
                sets: [makeSet({ index: 0 })],
            },
            catalog,
        );

        expect(result.ok).toBe(true);
        if (result.ok === false) return;
        expect(result.payload.title).toBe("Overhead Press");
    });

    it("resolves omitted title from template catalog", () => {
        const catalog = new Map([["ohp-1", "Overhead Press"]]);
        const result = resolveExercisePayload(
            {
                exercise_template_id: "ohp-1",
                sets: [makeSet({ index: 0 })],
            },
            catalog,
        );

        expect(result.ok).toBe(true);
        if (result.ok === false) return;
        expect(result.payload.title).toBe("Overhead Press");
    });

    it("fails when exercise_template_id is unknown", () => {
        const result = resolveExercisePayload(
            {
                exercise_template_id: "missing-id",
                sets: [makeSet({ index: 0 })],
            },
            new Map(),
        );

        expect(result.ok).toBe(false);
        if (result.ok === false) {
            expect(result.reason).toContain("Unknown exercise_template_id");
        }
    });
});
