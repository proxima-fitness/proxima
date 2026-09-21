/**
 * @module chat/sanity/stamp tests
 *
 * Periodization wave compile (ADR 0027 / 03, C2). Registry ops are
 * week1+delta (set). Warmup rows and warmup sets are not stamped.
 * Accessory only on a claimed deload / peak week. weight_kg is unchanged.
 */

import { describe, expect, it } from "vitest";

import type { TAgentProgramOperation } from "@/components/program-builder/mutations/agentSchema";
import { applyOperations } from "@/components/program-builder/mutations/apply";
import { isApplyBatchFailure } from "@/components/program-builder/mutations/types";
import type { TPeriodizationWave } from "@/app/api/chat/sanity/periodization-wave";
import { plateThenStamp, plateWeek1Across } from "@/app/api/chat/sanity/snapshot";
import { compilePeriodizationStamp } from "@/app/api/chat/sanity/stamp";
import type { TExerciseRoleAssignment } from "@/app/api/chat/sanity/types";

type TUpdateSetOp = Extract<TAgentProgramOperation, { op: "update_set" }>;

function makeSet(overrides: Partial<THevySets> = {}): THevySets {
    return {
        index: 0,
        type: "normal",
        reps: 8,
        weight_kg: 80,
        rpe: 7,
        distance_meters: null,
        duration_seconds: null,
        custom_metric: null,
        rep_range: { start: 8, end: 10 },
        ...overrides,
    };
}

function makeExercise(overrides: Partial<THevyExercise> = {}): THevyExercise {
    return {
        index: 0,
        title: "Bench Press (Barbell)",
        notes: "keep elbows in",
        rest_seconds: "90",
        exercise_template_id: "ex-1",
        supersets_id: null,
        sets: [makeSet(), makeSet({ index: 1 })],
        ...overrides,
    };
}

function makeDay(overrides: Partial<THevyRoutine> = {}): THevyRoutine {
    return {
        id: "1",
        title: "Push",
        folder_id: 0,
        order: "1",
        notes: "",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        exercises: [
            makeExercise({
                index: 0,
                title: "Band Pull Apart",
                exercise_template_id: "ex-wu",
                sets: [makeSet({ type: "normal", rpe: 5, weight_kg: null })],
            }),
            makeExercise({
                index: 1,
                title: "Bench Press (Barbell)",
                sets: [
                    makeSet({ type: "warmup", rpe: 5, weight_kg: 40 }),
                    makeSet({ index: 1, rpe: 7, weight_kg: 80 }),
                    makeSet({ index: 2, rpe: 8, weight_kg: 85 }),
                ],
            }),
            makeExercise({
                index: 2,
                title: "Cable Fly",
                exercise_template_id: "ex-acc",
                sets: [makeSet({ rpe: 7, weight_kg: 20 }), makeSet({ index: 1, rpe: 7, weight_kg: 20 })],
            }),
        ],
        ...overrides,
    };
}

const roles: TExerciseRoleAssignment[] = [
    { dayOrder: 1, exerciseIndex: 0, role: "warmup" },
    { dayOrder: 1, exerciseIndex: 1, role: "main" },
    { dayOrder: 1, exerciseIndex: 2, role: "accessory" },
];

const fourWeekWave: TPeriodizationWave = {
    weeks: [
        { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
        { week: 2, main: { rpeDelta: 1, setCountDelta: 1 } },
        { week: 3, main: { rpeDelta: 1, setCountDelta: 0 } },
        {
            week: 4,
            main: { rpeDelta: -2, setCountDelta: -1 },
            accessory: { rpeDelta: -2, setCountDelta: -1 },
            mainRepRange: { start: 5, end: 8 },
        },
    ],
};

function compiledOps() {
    return compilePeriodizationStamp([makeDay()], fourWeekWave, roles, 4);
}

describe("compilePeriodizationStamp", () => {
    it("Soft-fails when the Periodization wave is missing", () => {
        const result = compilePeriodizationStamp([makeDay()], undefined, roles, 4);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toBe("periodizationStamp.missingWave");
        expect(result.message).toMatch(/wave/i);
    });

    it("Soft-fails when Exercise roles are missing", () => {
        const result = compilePeriodizationStamp([makeDay()], fourWeekWave, null, 4);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toBe("periodizationStamp.missingRoles");
    });

    it("Soft-fails when no week-1 row is tagged main", () => {
        const warmupOnly: TExerciseRoleAssignment[] = [
            { dayOrder: 1, exerciseIndex: 0, role: "warmup" },
            { dayOrder: 1, exerciseIndex: 1, role: "warmup" },
            { dayOrder: 1, exerciseIndex: 2, role: "accessory" },
        ];
        const result = compilePeriodizationStamp([makeDay()], fourWeekWave, warmupOnly, 4);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toBe("periodizationStamp.emptyMains");
    });

    it("Soft-fails when a working-set count would drop below 1", () => {
        const oneWorking = makeDay({
            exercises: [
                makeExercise({
                    index: 0,
                    sets: [makeSet({ type: "warmup", rpe: 5 }), makeSet({ index: 1, rpe: 7 })],
                }),
            ],
        });
        const mainOnly: TExerciseRoleAssignment[] = [
            { dayOrder: 1, exerciseIndex: 0, role: "main" },
        ];
        const wave: TPeriodizationWave = {
            weeks: [
                { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                { week: 2, main: { rpeDelta: 0, setCountDelta: -1 } },
            ],
        };
        const result = compilePeriodizationStamp([oneWorking], wave, mainOnly, 2);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toBe("periodizationStamp.workingSetsBelowOne");
    });

    it("emits update_set RPE and edit_exercise set-count for mains, not add_set", () => {
        const result = compiledOps();
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.operations.map((op) => op.op as string)).not.toContain("add_set");
        expect(result.operations.some((op) => op.op === "edit_day_title")).toBe(false);

        const week2MainRpe = result.operations.filter(
            (op): op is TUpdateSetOp =>
                op.op === "update_set" &&
                op.folderIds?.[0] === 1 &&
                op.exerciseIndex === 1 &&
                op.set?.rpe != null,
        );
        expect(week2MainRpe.map((op) => op.set.rpe)).toEqual([8, 9, 9]);

        const week2Edit = result.operations.find(
            (op) => op.op === "edit_exercise" && op.folderIds?.[0] === 1 && op.exerciseIndex === 1,
        );
        expect(week2Edit?.op).toBe("edit_exercise");
        if (week2Edit?.op !== "edit_exercise") return;
        const working = week2Edit.exercise.sets.filter((set) => set.type !== "warmup");
        expect(working).toHaveLength(3);
        expect(week2Edit.exercise.sets[0]?.type).toBe("warmup");
        expect(working[2]?.weight_kg).toBe(85);
        expect(working[2]?.rpe).toBe(9);
    });

    it("stamps accessory only on a claimed deload week", () => {
        const result = compiledOps();
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const accessoryOps = result.operations.filter(
            (op): op is Extract<TAgentProgramOperation, { exerciseIndex: number }> =>
                "exerciseIndex" in op && op.exerciseIndex === 2,
        );
        expect(accessoryOps.every((op) => op.folderIds?.[0] === 3)).toBe(true);
        expect(accessoryOps.length).toBeGreaterThan(0);

        const week4AccessoryRpe = accessoryOps.filter(
            (op): op is TUpdateSetOp => op.op === "update_set" && op.set?.rpe != null,
        );
        expect(week4AccessoryRpe.map((op) => op.set.rpe)).toEqual([5]);
    });

    it("does not write warmup rows or warmup sets", () => {
        const result = compiledOps();
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(
            result.operations.some(
                (op) => "exerciseIndex" in op && op.exerciseIndex === 0,
            ),
        ).toBe(false);

        const mainSetOps = result.operations.filter(
            (op): op is TUpdateSetOp => op.op === "update_set" && op.exerciseIndex === 1,
        );
        expect(mainSetOps.every((op) => op.setIndex !== 0)).toBe(true);
    });

    it("does not write weight_kg on update_set and copies week-1 kg on edit_exercise", () => {
        const result = compiledOps();
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        for (const op of result.operations) {
            if (op.op === "update_set") {
                expect(op.set).not.toHaveProperty("weight_kg");
            }
        }

        const week2Edit = result.operations.find(
            (op) => op.op === "edit_exercise" && op.folderIds?.[0] === 1 && op.exerciseIndex === 1,
        );
        if (week2Edit?.op !== "edit_exercise") {
            expect(week2Edit?.op).toBe("edit_exercise");
            return;
        }
        expect(week2Edit.exercise.sets.map((set) => set.weight_kg)).toEqual([40, 80, 85, 85]);
    });

    it("writes mainRepRange on a Block boundary week", () => {
        const result = compiledOps();
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const week4MainRange = result.operations.filter(
            (op) =>
                op.op === "update_set" &&
                op.folderIds?.[0] === 3 &&
                op.exerciseIndex === 1 &&
                op.set.rep_range != null,
        );
        expect(week4MainRange.length).toBeGreaterThan(0);
        expect(week4MainRange[0]?.op === "update_set" ? week4MainRange[0].set.rep_range : null).toEqual({
            start: 5,
            end: 8,
        });
    });
});

describe("plateThenStamp", () => {
    it("applies week1+delta once: a second apply of the same ops does not climb", () => {
        const week1 = [makeDay()];
        const stamped = plateThenStamp(week1, fourWeekWave, roles, 4);
        expect(stamped.ok).toBe(true);
        if (!stamped.ok) return;

        const compiled = compilePeriodizationStamp(week1, fourWeekWave, roles, 4);
        expect(compiled.ok).toBe(true);
        if (!compiled.ok) return;

        const plated = plateWeek1Across(week1, 4);
        const first = applyOperations(plated, compiled.operations);
        expect(isApplyBatchFailure(first)).toBe(false);
        if (isApplyBatchFailure(first)) return;
        const second = applyOperations(first.program, compiled.operations);
        expect(isApplyBatchFailure(second)).toBe(false);
        if (isApplyBatchFailure(second)) return;

        const week2Main = stamped.program.find((day) => day.folder_id === 1)!;
        const firstWeek2 = first.program.find((day) => day.folder_id === 1)!;
        const secondWeek2 = second.program.find((day) => day.folder_id === 1)!;

        expect(week2Main.exercises[1].sets.map((set) => set.rpe)).toEqual([5, 8, 9, 9]);
        expect(secondWeek2.exercises[1].sets.map((set) => set.rpe)).toEqual(
            firstWeek2.exercises[1].sets.map((set) => set.rpe),
        );
        expect(week2Main.exercises[1].sets.map((set) => set.weight_kg)).toEqual([40, 80, 85, 85]);
        expect(week2Main.title).toBe("Push");

        const week4Main = stamped.program.find((day) => day.folder_id === 3)!;
        expect(week4Main.exercises[1].sets.filter((set) => set.type !== "warmup")).toHaveLength(1);
        expect(week4Main.exercises[0].sets[0].rpe).toBe(5);
        expect(week4Main.exercises[2].sets.map((set) => set.rpe)).toEqual([5]);
    });
});
