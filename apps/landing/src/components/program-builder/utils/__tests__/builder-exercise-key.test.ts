/**
 * Builder exercise key assignment (ADR 0024 / 04).
 */
import { describe, expect, it } from "vitest";

import { assignBuilderExerciseKeys } from "@/components/program-builder/utils/builder-exercise-key";
import { duplicateDay } from "@/components/program-builder/mutations/handlers";
import { normalizeProgramState } from "@/components/program-builder/utils/helpers";

const makeExercise = (overrides: Partial<THevyExercise> = {}): THevyExercise => ({
    index: 0,
    title: "Bench Press",
    notes: "",
    rest_seconds: "90",
    exercise_template_id: "ex-1",
    supersets_id: null,
    sets: [],
    ...overrides,
});

const makeDay = (overrides: Partial<THevyRoutine> = {}): THevyRoutine => ({
    id: "1",
    folder_id: 0,
    order: "1",
    title: "Push",
    notes: "",
    created_at: "",
    updated_at: "",
    exercises: [makeExercise(), makeExercise({ index: 1, title: "OHP", exercise_template_id: "ex-2" })],
    ...overrides,
});

describe("assignBuilderExerciseKeys", () => {
    it("assigns unique positive keys on hydrate and keeps the first occurrence", () => {
        const program = [makeDay()];

        const keyed = assignBuilderExerciseKeys(program);

        expect(keyed[0].exercises[0].builder_exercise_key).toBe(1);
        expect(keyed[0].exercises[1].builder_exercise_key).toBe(2);
        expect(keyed[0].exercises[0].index).toBe(0);
        expect(keyed[0].exercises[1].index).toBe(1);
    });

    it("keeps an existing unique key and remints a later duplicate", () => {
        const program = [
            makeDay({
                exercises: [
                    makeExercise({ builder_exercise_key: 7 }),
                    makeExercise({ index: 1, title: "OHP", exercise_template_id: "ex-2", builder_exercise_key: 7 }),
                ],
            }),
        ];

        const keyed = assignBuilderExerciseKeys(program);

        expect(keyed[0].exercises[0].builder_exercise_key).toBe(7);
        expect(keyed[0].exercises[1].builder_exercise_key).toBe(8);
    });

    it("remints keys on a duplicated day copy", () => {
        const source = assignBuilderExerciseKeys([makeDay()]);
        const copied = duplicateDay(source, 0, 1, 0, [2]);
        const reminted = assignBuilderExerciseKeys(copied);

        const sourceKeys = reminted
            .filter((day) => Number(day.order) === 1)
            .flatMap((day) => day.exercises.map((exercise) => exercise.builder_exercise_key));
        const copyKeys = reminted
            .filter((day) => Number(day.order) === 2)
            .flatMap((day) => day.exercises.map((exercise) => exercise.builder_exercise_key));

        expect(sourceKeys).toEqual([1, 2]);
        expect(copyKeys).toEqual([3, 4]);
        expect(new Set([...sourceKeys, ...copyKeys]).size).toBe(4);
    });
});

describe("normalizeProgramState", () => {
    it("assigns unique keys on hydrate", () => {
        const keyed = normalizeProgramState([makeDay()]);

        expect(keyed[0].exercises.map((exercise) => exercise.builder_exercise_key)).toEqual([1, 2]);
    });
});
