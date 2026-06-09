import { describe, expect, it } from "vitest";
import { applyOperations } from "@/components/program-builder/mutations/apply";
import { appendOrderToHevyRoutines } from "@/components/program-builder/utils/format-responses";
import { normalizeProgramForGrid } from "@/components/program-builder/utils/helpers";
import {
    renderRepsColumn,
    renderRpeColumn,
    renderSetsCount,
    renderWeightColumn,
} from "./hevyPrescriptionDisplay";

const makeSet = (index: number): THevySets => ({
    index,
    type: "normal",
    reps: 8,
    weight_kg: null,
    rpe: 7,
    distance_meters: null,
    duration_seconds: null,
    custom_metric: null,
    rep_range: null,
});

const makeExercise = (overrides: Partial<THevyExercise> = {}): THevyExercise => ({
    index: 1,
    title: "Bench Press",
    notes: "",
    rest_seconds: "90",
    exercise_template_id: "bench-1",
    supersets_id: null,
    sets: [makeSet(1)],
    ...overrides,
});

const makeDay = (id: number, week: number, order: number): THevyRoutine => ({
    id: String(id),
    folder_id: week,
    order: String(order),
    title: `Day ${order}`,
    notes: "",
    created_at: "",
    updated_at: "",
    exercises: [makeExercise()],
});

function build8x4Program(): THevyRoutine[] {
    const program: THevyRoutine[] = [];
    let id = 1;
    for (let week = 0; week < 8; week++) {
        for (let day = 1; day <= 4; day++) {
            program.push(makeDay(id++, week, day));
        }
    }
    return program;
}

function renderPrescriptionColumns(exercise: THevyExercise) {
    const sets = (exercise.sets ?? []).filter((s): s is THevySets => s != null);
    renderSetsCount(sets);
    renderRepsColumn(sets);
    renderWeightColumn(sets, false);
    renderRpeColumn(sets);
}

describe("shrink 8x4 program to 4x3", () => {
    it("delete weeks then days leaves renderable exercises", () => {
        let program = build8x4Program();

        for (const week of [7, 6, 5, 4]) {
            const result = applyOperations(program, [{ op: "delete_week", folderIds: [week] }]);
            expect(result.ok).toBe(true);
            if (result.ok) program = result.program;
        }

        const day4Ids = program.filter((d) => Number(d.order) === 4).map((d) => d.id);
        for (const dayId of day4Ids) {
            const result = applyOperations(program, [{ op: "delete_day", dayId }]);
            expect(result.ok).toBe(true);
            if (result.ok) program = result.program;
        }

        const ordered = appendOrderToHevyRoutines(program);
        const weeks = new Set(ordered.map((d) => d.folder_id));
        expect(weeks.size).toBe(4);
        expect(ordered.length).toBe(12);

        for (const day of ordered) {
            for (const exercise of day.exercises ?? []) {
                expect(() => renderPrescriptionColumns(exercise)).not.toThrow();
            }
        }
    });

    it("delete weeks in ascending order (agent mistake) still renders", () => {
        let program = build8x4Program();

        for (const week of [4, 5, 6, 7]) {
            const result = applyOperations(program, [{ op: "delete_week", folderIds: [week] }]);
            expect(result.ok).toBe(true);
            if (result.ok) program = result.program;
        }

        const ordered = appendOrderToHevyRoutines(program);
        for (const day of ordered) {
            for (const exercise of day.exercises ?? []) {
                expect(() => renderPrescriptionColumns(exercise)).not.toThrow();
            }
        }
    });

    it("undefined sets render as empty prescription cells", () => {
        expect(() => renderRepsColumn(undefined)).not.toThrow();
        expect(() => renderSetsCount(undefined)).not.toThrow();
        expect(() => renderWeightColumn(undefined, false)).not.toThrow();
        expect(() => renderRpeColumn(undefined)).not.toThrow();
    });

    it("normalizeProgramForGrid fills missing exercises/sets", () => {
        const malformed: THevyRoutine[] = [
            {
                ...makeDay(1, 0, 1),
                exercises: [{ ...makeExercise(), sets: undefined as unknown as THevySets[] }],
            },
            { ...makeDay(2, 0, 2), exercises: undefined as unknown as THevyExercise[] },
        ];
        const normalized = normalizeProgramForGrid(malformed);
        expect(normalized[0].exercises[0].sets).toEqual([]);
        expect(normalized[1].exercises).toEqual([]);
    });
});
